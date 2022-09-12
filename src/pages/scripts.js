'use strict';


export function create_mapping_of_last_election_results(results){

    // init
    const results_map = {}

    // set the name of the district as key, and the full datum as value
    results.forEach(r => {

        // grab key
        const { nomCirconscription } = r;

        // init
        results_map[nomCirconscription] = r
    })


    // set the candidate and party with the most vote as the elected
    Object.keys(results_map).forEach(nomCirconscription => {
        
        // grab the elected
        const elected_candidate = results_map[nomCirconscription]['candidats'].reduce((prev, curr) => {
            return prev['nbVoteTotal'] > curr['nbVoteTotal'] ? prev : curr;
        });

        // destructure
        const { nom, prenom, abreviationPartiPolitique } = elected_candidate;

        // init
        results_map[nomCirconscription]['party'] = abreviationPartiPolitique;
    })


    return results_map;
}

function dec2bin(dec) {
    return (dec >>> 0).toString(2);
}

export function export_selection(keys_parties, keys_conscription, seats_selection){

    // init
    let seats_formatted = [];

    // populate
    keys_conscription.forEach((d, i) => {
        seats_formatted.push([i, 7]);
    })

    // set known seats
    seats_selection.forEach(d => {
        
        // destructure
        const { party, uid } = d;

        // find location in keys arrays
        const index_party = keys_parties.indexOf(party);
        const index_conscription = keys_conscription.indexOf(uid);

        // check
        if (index_party < 0 || index_conscription < 0) return;

        // set tuple
        seats_formatted[index_conscription][1] = index_party
    });
    
    // sort
    seats_formatted.sort((a, b) => {

        // sort by first
        return a[0] - b[0]
    });

    // convert to binary string
    let binary_string = seats_formatted.map(d => { 
        const bin = `${dec2bin(d[1])}`;
        if (bin.length === 1) {
            return `00${bin}`;
        } else if (bin.length === 2) {
            return `0${bin}`;
        }  else if (bin.length === 3) {
            return bin
        }
    }).join('');

    // pad to be divisable by 8
    binary_string = '0' + binary_string;

    // convert to a sequence of 8 bits
    let byte_train = [];
    for (let i=0 ; i<binary_string.length ; i+=8) {
        const byte = binary_string.substring(i, i+8);
        byte_train.push(byte);
    }

    // convert
    const signature = byte_train.map(d => {
        return parseInt(d, 2).toString(16);
    }).map(d => {
        return d.length === 1 ? `0${d}` : d;
    }).join('');

    
    return signature;    
}


export function signature_to_seats(keys_parties, keys_conscription, signature) {

    // convert
    let hex_train = [];
    for (let i=0 ; i<signature.length ; i+=2) {
        const byte = signature.substring(i, i+2);
        hex_train.push(byte);
    }

    // verify
    if (hex_train.length !== 47) return;

    let binary_string = hex_train.map(d => {
        return parseInt(d, 16).toString(2)
    }).map(d => {
        // pad with zeros
        if (d.length === 1) {
            return `0000000${d}`;
        } else if (d.length === 2) {
            return `000000${d}`;
        } else if (d.length === 3) {
            return `00000${d}`;
        } else if (d.length === 4) {
            return `0000${d}`;
        } else if (d.length === 5) {
            return `000${d}`;
        } else if (d.length === 6) {
            return `00${d}`;
        } else if (d.length === 7) {
            return `0${d}`;
        } else {
            return d;
        }
    }).join('')

    // remove the padding
    binary_string = binary_string.substring(1, binary_string.length);

    // convert to sequences of 3
    let seats_formatted = []
    for (let i=0 ; i<binary_string.length ; i+=3) {
        const party_binary = binary_string.substring(i, i+3);
        seats_formatted.push(party_binary)
    }

    // convert to number
    seats_formatted = seats_formatted.map(d => parseInt(d, 2));

    // convert to seats
    let seats = {};
    seats_formatted.forEach((d, i) => {
        const conscription = keys_conscription[i];
        const party = d >= keys_parties.length ? undefined : keys_parties[d];
        seats[conscription] = party;
    })

    return seats;
}
