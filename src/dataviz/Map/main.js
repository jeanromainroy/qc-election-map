'use strict';

// import constants
import { DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, southEst, northWest, MAP_STYLE, MAP_ATTRIBUTION } from './env.js';

// import libs
import * as L from 'leaflet';
import * as d3 from 'd3';


export function initMap(){

    // Grab Map
    const map = L.map('map', {
        worldCopyJump: false,
        maxBoundsViscosity: 0.5,
        renderer: new L.SVG({
            padding: 1
        })
    })

    // Initialize the background map and the initial position
    L.tileLayer(
        MAP_STYLE, {
            maxZoom: MAX_ZOOM,
            minZoom: MIN_ZOOM,
            attribution: MAP_ATTRIBUTION
        }
    ).addTo(map)

    // Set the map's initial position
    map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)
    map.setMinZoom(MIN_ZOOM)
    map.setMaxZoom(MAX_ZOOM)

    // set max bounds
    const bounds = L.latLngBounds(southEst, northWest);
    map.setMaxBounds(bounds)

    // Get map size
    const { x, y } = map.getSize();

    // Initialize the SVG context that will host the Leaflet map.
    const svg = d3.select(map.getPanes().overlayPane).append('svg')
        .attr('width', x)
        .attr('height', y);

    // set the svg style
    svg.attr("overflow", "unset");

    // Initialize the group in wich we draw our objects
    const g = svg.append("g").attr("class", "leaflet-zoom-hide");

    return [ map, svg, g ]
}

export function getProjection(map){

    // projects a point in the map referential
    function projectPoint (x, y) {
        const point = map.latLngToLayerPoint(new L.LatLng(y, x))
        this.stream.point(point.x, point.y)
    }

    // create mapping
    return d3.geoPath(d3.geoTransform({ point: projectPoint }));
}

export function drawPaths(g, projection, paths, tooltip, tooltiptext, onclick){

    // draw boundaries
    g.selectAll('path')
        .data(paths)
        .enter()
        .append('path')
        .attr('d', projection)
        .attr("style", "pointer-events: auto") // pointer event is disabled by default

    // set tooltip
    if(typeof(tooltiptext) === 'function'){
        g.selectAll('path')
            .on('mouseover', (_, d) => {
                const html = tooltiptext(d);
                if(html === null) return;
                tooltip.style('display', 'inline');
                tooltip.html(html);
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('left', `${event.pageX + 8}px`)
                    .style('top', `${event.pageY + 8}px`);
            })
            .on('mouseout', () => {
                tooltip.style('display', 'none');
            })
    }

    // on click
    if(typeof(onclick) === 'function'){
        g.selectAll('path')
            .on('click', function(){
                d3.select(this).classed('clicked', !d3.select(this).classed('clicked'));
                onclick();
            })
    }
}

export function drawCircles(g, map, circles, tooltip, tooltiptext, onclick){

    // draw boundaries
    g.selectAll('circle')
        .data(circles)
        .enter()
        .append('circle')
        .attr('cx', d => {
            return map.latLngToLayerPoint(new L.LatLng(d['lat'], d['lng'])).x;
        })
        .attr('cy', d => {
            return map.latLngToLayerPoint(new L.LatLng(d['lat'], d['lng'])).y;
        })
        .attr('r', '20px')
        .attr("style", "pointer-events: auto") // pointer event is disabled by default

    // set tooltip
    if(typeof(tooltiptext) === 'function'){
        g.selectAll('circle')
            .on('mouseover', (_, d) => {
                const html = tooltiptext(d);
                if(html === null) return;
                tooltip.style('display', 'inline');
                tooltip.html(html);
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('left', `${event.pageX + 8}px`)
                    .style('top', `${event.pageY + 8}px`);
            })
            .on('mouseout', () => {
                tooltip.style('display', 'none');
            })
    }

    // on click
    if(typeof(onclick) === 'function'){
        g.selectAll('circle')
            .on('click', function(){
                d3.select(this).classed('clicked', !d3.select(this).classed('clicked'));
                onclick();
            })
    }
}

export function highlightPaths(g, regions){
    if(regions.length === 0) return;

    g.selectAll('path')
        .classed('highlight', d => {
            return regions.filter(([key, val]) => {
                return d['properties'][key] === val
            }).length > 0
        })
}

export function updateMap (map, svg, g, projection) {

    // get elements
    const paths = g.selectAll('path').nodes()
    const circles = g.selectAll('circle').nodes()

    if(Array.isArray(paths) && paths.length > 0){
        g.selectAll('path').attr('d', projection)
    }
    if(Array.isArray(circles) && circles.length > 0){
        g.selectAll('circle')
        .attr('cx', d => {
            return map.latLngToLayerPoint(new L.LatLng(d['latitude'], d['longitude'])).x;
        })
        .attr('cy', d => {
            return map.latLngToLayerPoint(new L.LatLng(d['latitude'], d['longitude'])).y;
        })
        .attr('r', map.getZoom())
    }
}

export function centerView(map, g){

    // init center coordinates
    let aveLat = 0.0
    let aveLng = 0.0
    let nbrContrib = 0

    // go through circles
    g.selectAll('circle').data().forEach(circle => {
        if (circle.LatLng) {
            aveLat += circle.LatLng.lat
            aveLng += circle.LatLng.lng
            nbrContrib += 1
        }
    })

    if (nbrContrib > 0) {
        aveLat = aveLat / (1.0 * nbrContrib)
        aveLng = aveLng / (1.0 * nbrContrib)

    } else {
        // we set to default coordinates
        aveLat = DEFAULT_LAT
        aveLng = DEFAULT_LNG
    }

    // set the map position
    map.setView([aveLat, aveLng], DEFAULT_ZOOM)
}
