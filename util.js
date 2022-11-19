
const loglevel = Object.freeze({
    info : Symbol('info'),
    warn : Symbol('warning'),
    err  : Symbol('error')
});

module.exports = {
    loglevel,
    
    TupleLogString: (data, log=loglevel.info, tag='out') => {
	const out = Object.entries(data).map(k => { return `${k[0]}:'${k[1]}'`; }).join('  ');
	return `chatthew.${log.description}.${tag}  ${out}`;
    },
    
    
    getRandomInt: (min, max) => { // min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
    },
    
    fixBigInt: (data) => {
	return JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint'
		? Number(value.toString())
		: value // return everything else unchanged
	));
    },

    dateConvert: (d) => {
	return d.toJSON().slice(0,19).replace('T', ' ');
    },
}

//modules.export = { loglevel, TupleLogString, getRandomInt, fixBigInt }; 
