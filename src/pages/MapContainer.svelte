<script>

    // properties
    export let districts_geojson;
    export let parties;
    export let last_election_results;
    export let conscriptions_names;
    export let seats_selection;

    // import libs
    import * as d3 from 'd3';
    import * as L from 'leaflet';
    import { onMount } from 'svelte';
    import { create_mapping_of_last_election_results, export_selection } from './scripts.js';

    // import svelte components
    import Map from '../dataviz/Map/Map.svelte';

    // is mobile
    import { isMobile } from '../libs/system';
    const _isMobile = isMobile();

    // constants
    const opacity_clicked = 0.7;
    const ALLOWABLE_PARTIES = ["CAQ", "PLQ", "PCQ", "QS", "PQ"];

    // variables
    let g, map, svg, tooltip, projection;
    let paths;
    let wasDragged = false;
    let seats_url = '';

    // create a color scale using the parties
    const color = d3.scaleOrdinal(parties.map(p => p['color'])).domain(parties.map(p => p['key']));

    // create mapping of the parties
    const parties_map = {}
    parties.forEach(party => parties_map[party['key']] = party)

    // create mapping of the last election results
    const last_election_results_map = create_mapping_of_last_election_results(last_election_results);


    // init seat count
    let seats = {}

    function getToolTipText (d) {
        
        // destructure
        const { name } = d['properties']

        // last election results
        const results = last_election_results_map[name];
        
        // check
        if (results === undefined || results === null) {
            return `<p style='font-size: 14px;>${name.trim()}</p>`
        }

        // format candidates
        const candidates_str = results['candidats'].map(d => {
            return `<p style='font-size: 11px;'>${d['tauxVote']}%, ${d['abreviationPartiPolitique']}</p>`
        }).slice(0, 3).join('')

        // return html
        return `<p style='font-size: 14px;'>${name.trim()}</p><p style='font-size: 11px; text-decoration: underline; margin-top: 8px;'>Dernière élection</p>${candidates_str}`
    }

    function reset(){
        reset_count();
        reset_map();
        setResults();
        update_count();
    }

    function reset_map(){
        g.selectAll('path')
            .each(function(d){
                // reset
                d3.select(this)
                    .attr('data-party-index', -1)
                    .attr('data-uid', d['properties']['name'])
                    .attr('data-party', undefined)
                    .style('fill', '#333333')
                    .style('fill-opacity', 0.0);
            })
    }

    function reset_count(){
        parties.forEach(p => {
            seats[p['key']] = {}
            seats[p['key']]['total'] = 0
        })
    }

    function get_districs_data_from_map(){

        // get all the electoral districts
        const _districts = d3.selectAll('path').nodes().map(n => {

            // get data
            const { uid, party } = n.dataset;

            return {
                'party': party,
                'uid': uid
            }
        });

        // keep unique
        const districts = {}
        _districts.forEach(d => {
            if (d['uid'] === undefined) return;
            districts[d['uid']] = d
        })

        // convert to arr
        return Object.keys(districts).map(k => districts[k]);
    }

    function update_count(){

        // get data from map districts
        const districts = get_districs_data_from_map();

        // reset to 0
        reset_count();

        // grab data from map
        Object.keys(districts).forEach(uid => {
            const district = districts[uid]
            const party = district['party'] === undefined || district['party'] === null ? null : district['party']
            if (party === null) return;
            if (!ALLOWABLE_PARTIES.includes(party)) return;
            seats[district['party']]['total'] += 1
        })

        // set url
        seats_url = generate_seats_url();
    }

    function sum_seats(_seats){
        if (_seats === undefined || _seats === null || _seats['CAQ'] === undefined) return 0;
        return Object.keys(_seats).map(k => seats[k]['total']).reduce((psum, a) => psum + a, 0);
    }

    function is_majority(_seats) {

        // if =0
        const sum = sum_seats(_seats);
        if (sum === 0) return ' ';

        // map
        const parties_ranked = Object.keys(_seats).map(party => {
            return [party, +_seats[party]['total']]
        }).sort((a, b) => {
            return b[1] - a[1];
        });

        if (+parties_ranked[0][1] === +parties_ranked[1][1]) {
            return `Égalité`
        } else if (parties_ranked[0][1] >= 63) {
            return `${parties_ranked[0][0]} Majoritaire`
        } else {
            return `${parties_ranked[0][0]} Minoritaire`
        }
    }

    function drawMask(){

        L.Mask = L.Polygon.extend({
            options: {
                outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
            },
            initialize: function (latLngs, options) {
                var outerBoundsLatLngs = [
                    this.options.outerBounds.getSouthWest(),
                    this.options.outerBounds.getNorthWest(),
                    this.options.outerBounds.getNorthEast(),
                    this.options.outerBounds.getSouthEast()
                ];
                L.Polygon.prototype.initialize.call(this, [outerBoundsLatLngs, latLngs], options);
            }
        });

        L.mask = function (latLngs, options) {
            return new L.Mask(latLngs, options);
        };

        let latlngs = [];
        const polygons = districts_geojson.features.map(f => f.geometry).filter(d => d !== null && d !== undefined).map(d => d.coordinates);
        polygons.forEach(_polygons => {
            _polygons.forEach(polygon => {
                if (polygon[0].length > 2) {
                    polygon.forEach(_polygon => {
                        const _latlngs = _polygon.map(p => {
                            return new L.LatLng(p[1], p[0])
                        });
                        latlngs.push(_latlngs);
                    })
                }else{
                    const _latlngs = polygon.map(p => {
                        return new L.LatLng(p[1], p[0])
                    });
                    latlngs.push(_latlngs);
                }
            })
        });

        L.mask(latlngs).addTo(map);

        // style
        const layer = document.getElementsByClassName('leaflet-interactive');
        layer[0].style.fillOpacity = 1.0
        layer[0].style.fill = "#fff"
        layer[0].style.cursor = "default"
        layer[0].id = 'mask-path'
    }

    function drawPaths(){

        // prevent click on drag
        map.on('dragend', function(e){
            wasDragged = true;
            setTimeout(() => {
                wasDragged = false;
            }, 200);
        });

        // draw boundaries
        g.selectAll('path')
            .data(districts_geojson.features)
            .enter()
            .append('path')
            .each(function(d){
                d3.select(this).attr('data-party-index', -1)
                d3.select(this).attr('data-uid', d['properties']['name'])
            })
            .attr('d', projection)
            .attr("style", "pointer-events: auto") // pointer event is disabled by default
            .on('mouseover', function(_, d){
                if (_isMobile) return;
                const html = getToolTipText(d);
                if(html === null) return;
                tooltip.show();
                tooltip.html(html);
            })
            .on('mousemove', (event) => {
                if (_isMobile) return;
                tooltip.move(event)
            })
            .on('mouseout', function(){
                if (_isMobile) return;
                tooltip.hide();
            })
            .on('click', function(){
                if(wasDragged) return;

                // get data
                const uid = d3.select(this).attr('data-uid')
                const partyIndex = d3.select(this).attr('data-party-index');

                // increment index
                const new_partyIndex = (+partyIndex + 1) % parties.length;

                // new party
                const new_party = parties[new_partyIndex]['key']

                // new color
                const new_color = color(new_party)

                // get all paths with this uid
                const paths = d3.selectAll('path').filter(function(){
                    const _uid = d3.select(this).attr('data-uid');
                    return _uid === uid
                });

                // update
                paths
                    .attr('data-party-index', new_partyIndex)
                    .attr('data-party', new_party)
                    .style('fill', new_color)
                    .style('fill-opacity', opacity_clicked);

                // update the count of each party
                update_count();

                // update title
                // update_title();
            })
    }

    function setResults(){
        g.selectAll('path')
            .each(function(){
                const name = d3.select(this).data()[0]['properties']['name'];

                // check
                if (seats_selection[name] === undefined || seats_selection[name] === null) {
                    return;
                }

                const party = seats_selection[name];

                // check
                if (party === undefined || party === null || party.length === 0 || !ALLOWABLE_PARTIES.includes(party)) {
                    return;
                }

                d3.select(this)
                    .attr('data-party', party)
                    .style('fill', parties_map[party]['color'])
                    .style('fill-opacity', opacity_clicked);
            })
    }

    onMount(() => {

        // draw paths
        drawPaths();

        // draw mask
        drawMask();

        // reset
        reset();

        // reset
        seats_selection = {};
    }); 
    
    
    async function copy_to_clipboard() {
        // Get the text field
        var copyText = document.getElementById("seats-url");

        // Select the text field
        copyText.select();
        copyText.setSelectionRange(0, 99999); // For mobile devices

        // Copy the text inside the text field
        await navigator.clipboard.writeText(copyText.value);

        // Alert the copied text
        alert("Url copied to clipboard");
    }

    
    function generate_seats_url(){
        const signature = export_selection(parties.map(d => d['key']), conscriptions_names, get_districs_data_from_map());
        if (signature === undefined || signature === null) return '';
        return `${window.location.href.split('?')[0]}?seats=${signature}`;
    }

</script>


<!-- URL containing the seats -->
<input type="text" value={seats_url} id="seats-url">


<!-- The Map -->
<div id="mapcontainer">
    <Map bind:projection={projection} bind:map={map} bind:paths={paths} bind:svg={svg} bind:g={g} bind:tooltip={tooltip}/>
</div>


<div id="topline-container">
    <div class="info-container"></div>

    <!-- Reset Button -->
    <div class="info-container">
        <button class="m-button" on:click={reset}>Réinitialiser</button>
    </div>

    <div class="info-container"></div>
    
    <div class="text-container">
        <p>{is_majority(seats)}</p>
        <p>{sum_seats(seats)}/125</p>
    </div>   
    
    <div class="info-container"></div>

    <!-- Share Button -->
    <div class="info-container">
        <button class="m-button" on:click={copy_to_clipboard}>Partager</button>    
    </div> 

    <div class="info-container"></div>
</div>


<!-- The seats count -->
<div id="seatscontainer">

    <div class="party-container">
        <img alt="logo caq"  src="assets/logo/caq.png"/>
        <p class="seatcount" id="caq-seatcount" style="color: #06B5FF">{seats['CAQ'] === undefined ? 0 : seats['CAQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo plq"  src="assets/logo/plq.png"/>
        <p class="seatcount" id="plq-seatcount" style="color: #F7070F">{seats['PLQ'] === undefined ? 0 : seats['PLQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo pcq"  src="assets/logo/pcq.png"/>
        <p class="seatcount" id="pcq-seatcount" style="color: #0A0095">{seats['PCQ'] === undefined ? 0 : seats['PCQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo qs"  src="assets/logo/qs.png"/>
        <p class="seatcount" id="qs-seatcount" style="color: #FFA406">{seats['QS'] === undefined ? 0 : seats['QS']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo pq" src="assets/logo/pq.png"/>
        <p class="seatcount" id="pq-seatcount" style="color: #75B6FF">{seats['PQ'] === undefined ? 0 : seats['PQ']['total']}</p>
    </div>

</div>




<style>

    #seats-url {
        position: absolute;
        top: 0px;
        right: 0px;
        visibility: hidden;
    }

    .m-button {
        z-index: 999;
        background-color: #ccc;
        color: #fff;
        outline: none;
        user-select: none;
        border: none;
        border-radius: 6px;
        font-size: var(--font-size-small);
        cursor: pointer;
        margin: 0px;
        background-color: #aaa; /* Green */
        border: none;
        color: white;
        padding: 12px 16px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
    }

    .m-button:hover {
        filter: brightness(1.1);
    }

    #mapcontainer{
        position: absolute;
        top: 64px;
        left: 0px;
        right: 0px;
        bottom: calc(32px + var(--font-size-normal));
        background-color: white;
    }

    #seatscontainer {
        position: absolute;
        left: 0px;
        right: 0px;
        bottom: 0px;
        margin: 0px auto;
        background-color: white;
        padding: 16px;
        border-top: 0.5px solid black;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        overflow: hidden;
        align-items: center;
    }

    #topline-container {
        position: absolute;
        left: 0px;
        right: 0px;
        top: 0px;
        margin: 0px auto;
        min-height: 64px;
        background-color: white;
        padding: 0px;
        border-bottom: 0.5px solid black;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        overflow: hidden;
        align-items: center;
    }

    .party-container {
        max-height: 64px;
        width: 20vw;
        display: flex;
        flex-direction: column;
    }

    .info-container {
        max-height: 48px;
        display: flex;
        align-items: center;
    }

    .text-container {
        max-height: 48px;
        display: flex;
        flex-direction: column;
    }

    .text-container p {
        margin: 0px;
        padding: 0px;
    }

    img { 
        object-fit: contain;
        width: 100%;
        height: 32px;
    }

    .seatcount {
        font-weight: 700;
    }

</style>