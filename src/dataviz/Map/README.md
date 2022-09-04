# Svelte Map

Our beloved d3.js + leaflet map as a svelte component.


## Mise-en-place

1. Set your parameters in the env.js file


## Setting the geographic boundaries

1. Navigate to this [website](https://gadm.org/download_country_v3.html) and select your desired country

2. Download the "shapefile"

3. To visualize your boundaries use this [website](https://mapshaper.org/). Import the files ending with _0., then _1., and so on to select the desired level of details.

4. You should only have 1 layer, delete the others

5. Use the "select features" tool to delete features.

6. Use the "Simplify" tool, and set the "Settings" to a low percentage to compress the output file.

7. Use the "Export" tool and select the "GeoJSON" file format

8. Here is a snippet of the code to draw the paths on the map,

        // get the file
        const geojson = await getRequestWrapper('assets/data/electoral-districts.geojson', 'eng')

        // draw boundaries
        g.selectAll('path')
            .data(geojson.features)
            .enter()
            .append('path')
            .attr('d', projection)
            .attr("style", "pointer-events: auto") // pointer event is disabled by default
