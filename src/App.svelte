<script>

    // imports libs
    import { onMount } from 'svelte';
    import { loadLangFromURL, getUrlParams } from './libs/url.js';
    import { getString } from './libs/locale';
    import { getRequestWrapper } from './libs/http.js';
    import { signature_to_seats } from './pages/scripts.js';

    // import components
    import Loader from './components/Loader.svelte';

    // import pages
    import MapContainer from './pages/MapContainer.svelte';

    // title
    let title = '';

    // grab
    let lang = loadLangFromURL() || 'eng';

    // data
    let districts_geojson;
    let parties;
    let last_election_results;
    let conscriptions;
    let seats_selection;

    // ui logic
    let ready = false;
    let init_successful = false;

    // get url params
    const url_params = getUrlParams();

    async function load_data(){
        districts_geojson = await getRequestWrapper('assets/data/electoral-districts.geojson')
        parties = await getRequestWrapper('assets/data/parties.json')
        last_election_results = await getRequestWrapper('assets/data/results_previous_election.json');
        conscriptions = await getRequestWrapper('assets/data/conscriptions.json');
        return districts_geojson !== null && parties !== null && last_election_results !== null && conscriptions !== null;
    }

    onMount(async () => {

        // load data
        init_successful = await load_data();

        // check url params
        if (url_params['seats'] !== undefined && url_params['seats'] !== null) {
            seats_selection = signature_to_seats(parties.map(d => d['key']), conscriptions['names'], url_params['seats']);
        } else {
            seats_selection = {};
            conscriptions['names'].forEach(name => { seats_selection[name] = ''});
        }

        // set ready flag
        ready = true;
    })

</script>


<!-- Set app name -->
<title>{title}</title>


<!-- Where the pages go -->
{#if ready}
    {#if init_successful}
        <main>
            <MapContainer 
                parties={parties} 
                districts_geojson={districts_geojson} 
                last_election_results={last_election_results['circonscriptions']}
                conscriptions_names={conscriptions['names']}
                seats_selection={seats_selection}
            />
        </main>
    {/if}

        
    <!-- Footer -->
    <div class="footer">
        <hr>
        {@html getString(lang, 'footer')}
    </div>

{:else}
    <Loader/>
{/if}


<style>

    /* Our CSS variables for the whole project */
    :global(:root) {
        --white-transparent: rgba(255, 255, 255, 0.85);
        --black-dark: #222;
        --black: #444;
        --red: hsl(0, 74%, 60%);
        --red-dark: hsl(0, 74%, 30%);
        --green: #009900;
        --main-color: hsl(219, 42%, 41%);
        --main-color-dark: hsl(219, 42%, 28%);
        --main-color-light: hsl(219, 42%, 54%);
        --strong-border: 1px solid rgba(0, 0, 0, .5);
        --box-shadow: 1px 1px 3px rgba(68, 40, 40, 0.2);
        --box-shadow-dark: 0px 2px 5px rgba(0, 0, 0, .5);
        --box-shadow-focus: inset 0 2px 2px rgba(0, 0, 0, 0.075), 0 0 8px var(--main-color-light);
        --max-width-small: 500px;
        --max-width: 700px;
        --max-width-large: 800px;
        --font-size-very-very-very-small: 0.7em;
        --font-size-very-very-small: 0.8em;
        --font-size-very-small: 0.9em;
        --font-size-small: 1.05em;
        --font-size-normal: 1.3em;
        --font-size-large: 1.8em;
        --font-size-very-large: 2em;
        --font-bold: 600;
        --font-normal: 400;
    }

    :global(.red){
        color: var(--red);
    }

    :global(.green){
        color: var(--green);
    }

    :global(p){
        color: var(--black);
    }

    /* Text formatting */
    :global(.title) {
        text-align: left;
        color: var(--black-dark);
        margin: 1.5em auto 0.25em;
        font-weight: var(--font-bold);
        font-size: var(--font-size-large);
        max-width: var(--max-width);
    }

    :global(.subtitle) {
        text-align: left;
        color: var(--black-dark);
        margin: 1.5em auto 0.5em;
        font-weight: var(--font-bold);
        font-size: var(--font-size-normal);
        max-width: var(--max-width);
    }

    :global(.subsubtitle) {
        text-align: left;
        color: var(--black-dark);
        margin: 1.5em auto -0.5em;
        font-weight: var(--font-bold);
        font-size: var(--font-size-small);
        max-width: var(--max-width);
    }


    :global(.subsubsubtitle) {
        text-align: left;
        color: var(--black-dark);
        margin: 1.5em auto -0.75em;
        padding: 0px;
        font-weight: var(--font-bold);
        font-size: var(--font-size-very-small);
        max-width: var(--max-width);
    }

    /* D3 tooltip */
    :global(.tooltip) {
        display: none;
        position: absolute;
        text-align: left;
        border: 1px solid #333;
        background: rgb(255, 255, 255);
        color: var(--black);
        box-shadow: 0px 2px 5px rgba(0, 0, 0, .3);
        text-transform: capitalize;
        margin: 0px;
        padding: 8px;
        z-index: 9;
        line-height: 1.2em;
        max-width: 350px;
    }

    :global(.tooltip h1) {
        font-size: var(--font-size-normal);
        margin: 0px;
        padding: 0px;
    }

    :global(.tooltip h2) {
        font-size: var(--font-size-small);
        margin: 0px;
        margin-bottom: 4px;
        padding: 0px;
    }

    :global(.tooltip p) {
        font-size: var(--font-size-very-small);
        margin: 0px;
        padding: 0px;
    }

    /* Sweet alert global variables */
    :global(.swal-footer){
        text-align: center;
    }

    :global(.swal-button){
        background-color: var(--main-color);
        color: white;
    }

    :global(.swal-button--cancel){
        color: white;
    }

    :global(.swal-button:not([disabled]):hover){
        background-color: var(--main-color-dark);
    }

    :global(.swal-button--danger){
        background-color: var(--red);
    }
    :global(.swal-button--danger:not([disabled]):hover){
        background-color: var(--red-dark);
    }

    :global(.swal-text) {
        text-align: center;
    }

    /* Transtions */
    :global(.fade-in) {
        animation: fadeIn 1.5s;
        -webkit-animation: fadeIn 1.5s;
        -moz-animation: fadeIn 1.5s;
        -o-animation: fadeIn 1.5s;
        -ms-animation: fadeIn 1.5s;
        opacity: 1.0;
    }
    @keyframes fadeIn {
        0% {opacity:0;}
        100% {opacity:1;}
    }

    @-moz-keyframes fadeIn {
        0% {opacity:0;}
        100% {opacity:1;}
    }

    @-webkit-keyframes fadeIn {
        0% {opacity:0;}
        100% {opacity:1;}
    }

    @-o-keyframes fadeIn {
        0% {opacity:0;}
        100% {opacity:1;}
    }

    @-ms-keyframes fadeIn {
        0% {opacity:0;}
        100% {opacity:1;}
    }

    :global(.fade-out) {
        animation: fadeOut 1.5s;
        -webkit-animation: fadeOut 1.5s;
        -moz-animation: fadeOut 1.5s;
        -o-animation: fadeOut 1.5s;
        -ms-animation: fadeOut 1.5s;
        opacity: 0.0;
    }
    @keyframes fadeOut {
        0% {opacity:1;}
        100% {opacity:0;}
    }

    @-moz-keyframes fadeOut {
        0% {opacity:1;}
        100% {opacity:0;}
    }

    @-webkit-keyframes fadeOut {
        0% {opacity:1;}
        100% {opacity:0;}
    }

    @-o-keyframes fadeOut {
        0% {opacity:1;}
        100% {opacity:0;}
    }

    @-ms-keyframes fadeOut {
        0% {opacity:1;}
        100% {opacity:0;}
    }

    main {
        text-align: center;
        padding: 1em;
        margin: 32px auto 0px;
    }

    .description {
        margin: auto;
        max-width: var(--max-width-large);
        padding-bottom: 48px;
        text-align: justify;
    }

    .footer {
        margin: 0px auto 0px;
        padding-bottom: 16px;
        max-width: var(--max-width-large);
        text-align: center;
        font-weight: 300;
        font-style: italic;
        font-size: var(--font-size-very-small);
        color: var(--black);
    }

</style>