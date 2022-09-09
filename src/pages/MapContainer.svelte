<script>

    // properties
    export let lang;
    export let districts_geojson;
    export let parties;
    export let results;
    export let title;

    // d3 lib
    import * as d3 from 'd3';

    // leaflet
    import * as L from 'leaflet';

    // import svelte components
    import Map from '../dataviz/Map/Map.svelte';

    // import ui libs
    import { onMount } from 'svelte';

    // is mobile
    import { isMobile } from '../libs/system';
    const _isMobile = isMobile();

    // constants
    const opacity_clicked = 0.7;

    // variables
    let g, map, svg, tooltip, projection;
    let paths;
    let wasDragged = false;

    // create a color scale using the parties
    const color = d3.scaleOrdinal(parties.map(p => p['color'])).domain(parties.map(p => p['key']));

    // create mapping of the parties
    const parties_map = {}
    parties.forEach(party => parties_map[party['key']] = party)

    // create a mapping of the results
    const results_map = {}
    results.forEach(r => {

        // grab key
        const { nomCirconscription } = r;

        // init
        results_map[nomCirconscription] = r
    })
    Object.keys(results_map).forEach(nomCirconscription => {
        
        // grab the elected
        const elected_candidate = results_map[nomCirconscription]['candidats'].reduce((prev, curr) => {
            return prev['nbVoteTotal'] > curr['nbVoteTotal'] ? prev : curr;
        });

        // destructure
        const { nom, prenom, abreviationPartiPolitique } = elected_candidate;

        // init
        results_map[nomCirconscription]['party'] = '';

        // go through parties
        parties.forEach(party => {
            if (abreviationPartiPolitique === party['key']) {
                results_map[nomCirconscription]['party'] = party['key']
            }
        })
    })

    // init seat count
    let seats = {}
    let seats_tabular = null;
    let nbr_districts = 0;
    let nbr_districts_selected = 0;

    function getToolTipText (d) {
        const { name } = d['properties']
        return `<p style='font-size: 12px;'>${name.trim()}</p>`
    }

    function reset(){
        reset_count();
        reset_map();
        setResults();
        update_count();
        // update_title();
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

    function update_title(){

        // group seats by parties
        const counts = Object.keys(seats).map(party => {
            return [party, +seats[party]['total']]
        })

        // sort in descending order
        counts.sort((a, b) => b[1] - a[1])

        // set title
        if (counts[0][1] === counts[1][1]){
            title = 'Hung parliament'
        }else if(counts[0][1] >= 170){
            title = `${counts[0][0]} majority`
        }else if(counts[0][1] < 170){
            title = `${counts[0][0]} minority`
        }
    }

    function update_count(){

        // get data from map districts
        const districts = get_districs_data_from_map();

        // reset to 0
        reset_count();

        // set topline metrics
        nbr_districts = districts.length;
        nbr_districts_selected = districts.filter(d => d['party'] !== undefined && d['party'] !== null).length;

        // grab data from map
        Object.keys(districts).forEach(uid => {
            const district = districts[uid]
            const party = district['party'] === undefined || district['party'] === null ? null : district['party']
            if (party === null) return;
            seats[district['party']]['total'] += 1
        })
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
                if (results_map[name] === undefined || results_map[name] === null) {
                    return;
                }

                const party = results_map[name]['party'];

                // check
                if (party === undefined || party === null || party.length === 0) {
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
    })
    

</script>


<!-- The Map -->
<div id="mapcontainer">
    <Map bind:projection={projection} bind:map={map} bind:paths={paths} bind:svg={svg} bind:g={g} bind:tooltip={tooltip}/>
</div>


<!-- The seats count -->
<div id="seatscontainer">
    <div class="party-container"></div>

    <div class="party-container">
        <img alt="logo caq"  src="assets/logo/caq.png"/>
        <p id="caq-seatcount" style="color: #06B5FF">{seats['CAQ'] === undefined ? 0 : seats['CAQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo plq"  src="assets/logo/plq.png"/>
        <p id="plq-seatcount" style="color: #F7070F">{seats['PLQ'] === undefined ? 0 : seats['PLQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo pcq"  src="assets/logo/pcq.png"/>
        <p id="pcq-seatcount" style="color: #0A0095">{seats['PCQ'] === undefined ? 0 : seats['PCQ']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo qs"  src="assets/logo/qs.png"/>
        <p id="qs-seatcount" style="color: #FFA406">{seats['QS'] === undefined ? 0 : seats['QS']['total']}</p>
    </div>

    <div class="party-container">
        <img alt="logo pq" src="assets/logo/pq.png"/>
        <p id="pq-seatcount" style="color: #75B6FF">{seats['PQ'] === undefined ? 0 : seats['PQ']['total']}</p>
    </div>

    <div class="party-container"></div>
</div>

<style>

    #mapcontainer{
        position: absolute;
        top: 0px;
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
    }

    .party-container {
        max-height: 64px;
        display: flex;
        flex-direction: column;
    }

    img { 
        object-fit: contain;
        width: 100%;
        height: 32px;
    }

</style>