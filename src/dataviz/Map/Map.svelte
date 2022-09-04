<script>

    // --- Import Libs ---
    import * as d3 from 'd3';
    import { onMount } from 'svelte';

    // map styles
    import "../../../node_modules/leaflet/dist/leaflet.css";

    // --- Import Functions ---
    import { updateMap, getProjection, initMap, centerView } from './main.js';

    // --- Properties ---
    // data
    export let map, svg, g, projection;
    export let tooltip;

    // functions
    export function center(){
        centerView(map, g);
    }
    export function update(){
        updateMap(map, g, projection);
    }

    // Wait for DOM to be loaded
    onMount(() => {

        // initialize map
        [ map, svg, g ] = initMap();

        // grab tooltip
        tooltip = d3.select('#maptooltip');

        // get map offset
        const { left, top } = d3.select('#map').node().getBoundingClientRect();

        // set funcs
        tooltip.show = function(){
            this.style('display', 'inline');
        }
        tooltip.hide = function(){
            this.style('display', 'none');
        }
        tooltip.move = function(event){
            this
                .style('left', `${event.pageX - left + 8}px`)
                .style('top', `${event.pageY - top + 8}px`);
        }

        // get projection
        projection = getProjection(map);

        // add listener to update map on zoom event
		map.on("zoom", () => {
            updateMap(map, svg, g, projection);
        });
		updateMap(map, svg, g, projection);

        // prevent zoom on double click
        map.doubleClickZoom.disable();
    });
</script>

<div id="map"></div>
<div id="maptooltip" class='tooltip'></div>

<style>

    #map {
        position: absolute;
        width: 100%;
        height: 100%;
        margin: auto;
        background-color: #fff;
        overflow: hidden;
        z-index: 0;
        border: 1px solid black;
    }

    :global(path) {
        fill-opacity: 0.0;
        fill: rgba(51, 51, 51);
        stroke: rgba(51, 51, 51, 0.3);
        stroke-width: 1px;
    }

    :global(path.highlight){
        fill: var(--main-color);
        stroke:var(--main-color);
        stroke-width: 3px;
    }

    :global(path:hover) {
        fill-opacity: 0.15;
    }

    :global(path.clicked){
        fill-opacity: 0.5;
    }

    :global(circle) {
        stroke: black;
        cursor: pointer;
    }

    :global(circle.selected) {
        opacity: 1;
    }

    :global(circle.deselected) {
        opacity: 0.3;
    }

</style>
