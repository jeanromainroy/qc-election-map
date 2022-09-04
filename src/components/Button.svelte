<script>

    // properties
    export let lang;
    export let string_key;
    export let disabled = false;
    export let onclick;

    // locale lib
    import { getString } from '../libs/locale.js';

    // onclick
    function _onclick(){
        if(typeof(onclick) === 'function'){
            onclick();
        }
    }

</script>

<div>
    <button on:click={() => { _onclick() }} disabled={disabled}>{getString(lang, string_key)}</button>
</div>

<style>

    div{
        text-align: center;
    }

    button{
        cursor: pointer;
        margin: 0 0.5em 0;
        padding: 0.5em 1em;
    }

</style>