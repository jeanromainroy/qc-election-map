<script>

    // Properties
    export let data;
    export let cell_func;
    export let table_id = `mtable-${Math.floor(Math.random()*10000)}`;
    export let disable = false;

    // ids
    const table_id_values = `${table_id}-values`;
    const table_id_headers = `${table_id}-headers`;

    // Variable storing the data to display
    let _headers = null;
    let _values = null;

    // validation func
    function validate(df){

        if (!Array.isArray(df)){
            return false;
        }

        if (df.length < 1){
            console.error('invalid data for table - array of length < 1');
            return false;
        }

        if(!Array.isArray(df[0])){
            console.error('invalid data for table - first element not an array');
            return false;
        }

        if(df[0].length === 0){
            console.error('invalid data for table - first element of length 0');
            return false;
        }

        // init process var
        let _previous_length = df[0].length;

        // go through data
        for(let i=1 ; i<df.length ; i++){

            // check that each element is an array
            if(!Array.isArray(df[i])){
                console.error(`invalid data for table - ${i}th element not an array`);
                return false;
            }

            // check that each element has the same
            if(df[i].length !== _previous_length){
                console.error(`invalid data for table - ${i}th element not of same length`);
                return false;
            }
        }

        return true;
    }

    function set_column_width(){

        // get values' table
        const table_values = document.getElementById(table_id_values);
        if(table_values === null) return;

        // get headers' table
        const table_headers = document.getElementById(table_id_headers);
        if(table_headers === null) return;

        // get first row
        let first_tr = table_values.querySelectorAll("tr")[0];
        if(first_tr === undefined) return;

        // get values' table columns width
        let ths = first_tr.querySelectorAll("th");
        let column_widths_sum = 0.0;
        let column_widths = Array.from(ths, th => {
            const w = 1.0*th.getBoundingClientRect().width;
            column_widths_sum += w;
            return w;
        });

        // convert to percentage
        column_widths = column_widths.map(c => Math.round((100.0*c)/column_widths_sum))

        // check if we have 100%
        column_widths_sum = column_widths.reduce((a, b) => a + b, 0);
        if(column_widths_sum !== 100){
            column_widths[0] = (100-column_widths_sum) + column_widths[0];
        }

        // set column widths
        ths = table_headers.querySelectorAll("tr")[0].querySelectorAll("th");
        for (let i = 0; i < ths.length; i++){
            ths[i].style.width = `${column_widths[i]}%`;
        }

        let trs = table_values.querySelectorAll("tr");
        for (let j = 0; j < trs.length; j++){
            ths = trs[j].querySelectorAll("th");
            for (let i = 0; i < ths.length; i++){
                ths[i].style.width = `${column_widths[i]}%`;
            }
        }
    }

    // if all test passed
    $: if(validate(data)){

        // set values
        _values = data.filter((_, i) => {
            return i !== 0;
        });

        // set headers
        _headers = data[0];

        // update column width
        setTimeout(() => {
            set_column_width();

            // apply something to each cell
            if(typeof(cell_func) === 'function'){
                iterate_through_cells();
            }
        }, 100);
    }

</script>

{#if _headers !== null }
    <!-- Headers -->
    <div class="table-headers" id="{table_id_headers}" >
        <table>
            <tr>
                {#each _headers as d}
                    <th class='header'>{d}</th>
                {/each}
            </tr>
        </table>
    </div>
{/if}

{#if _values !== null }
    <!-- Values -->
    <div class="table-values" id="{table_id_values}">
        <table class={disable ? 'disabled' : 'enabled'}>
            {#each _values as row, row_id}
                <tr>
                    {#each row as value, col_id}
                        <th class='value' data-row_id='{row_id}' data-col_id='{col_id}'>
                            {#if typeof(value) === 'string' && value.length > 4 && value.substring(0, 4) === 'http'}
                                <a href={value} target="_blank">{value}</a>
                            {:else}
                                {value}
                            {/if}
                        </th>
                    {/each}
                </tr>
            {/each}
        </table>
    </div>

{/if}


<style>

    .disabled {
        opacity: 0.3;
    }

    .enabled {
        opacity: 1.0;
    }

    div {
        margin-left: auto;
        margin-right: auto;
        margin-top: -4px;
        margin-bottom: 0px;
        max-width: var(--max-width);
        max-height: 190px;
        overflow-y: scroll;
        padding-left: 8px;
        padding-right: 8px;
    }

    table, th {
        border-collapse: collapse;
        table-layout: fixed;
    }

    table {
        width: 100%;
    }

    tr {
        width: 100%;
    }

    th {
        padding: 8px 0px 8px;
        overflow: hidden;
        word-wrap:break-word;
        background-color: white;
        line-height: var(--line-height-small);
    }

    tr:not(:last-child) {
        border-bottom: 1px solid #ddd;
    }

    .table-headers {
        z-index: 8;
        padding-bottom: 8px;
    }

    .table-values {
        z-index: 7;
    }

    .value {
        font-weight: var(--font-normal);
        font-size: var(--font-size-very-very-very-small);
        /* text-transform: lowercase; */
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .header {
        font-weight: var(--font-bold);
        font-size: var(--font-size-very-very-small);
    }

    ::-webkit-scrollbar {
        -webkit-appearance: none;
        width: 7px;
    }

    ::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background-color: rgba(0, 0, 0, .5);
        box-shadow: 0 0 1px rgba(255, 255, 255, .5);
    }

</style>