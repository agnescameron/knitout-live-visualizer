//------------------------------------
let lines = [];

// add menu for selecting these
// these are the kniterate settings
let defaultRollerAdvance = 450, defaultStitchNumber = 5, defaultSpeedNumber = 150;
let defaultWasteCarrier = '6', defaultDrawCarrier = '1', defaultCastonCarrier = '2';
let defaultCastonStyle = 2; castonCarrier = 3;// open tube

let rollerAdvance, stitchNumber, speedNumber;
let wasteCarrier, drawCarrier;
let castonStyle;

let minN, maxN, wasteMin, wasteMax;
let width, wastePasses = 71;
let carriers = [];
let inCarriers = [];


function removeComment(str) {
	if (str.includes(';')) return str.slice(0, str.indexOf(';'));
	else return str;
}

function getInCarriers (file) {
	if (file) {
		//note: charAt is fine here since kniterate only has single-digit carriers 
		//TODO: change if make waste-section.js for SWG too
		let inCarrier = lines[0].split(' ')[1].charAt(0); 
		lines.shift();
		inCarriers = [inCarrier];
		lines.map((ln, idx) => {
			let info = ln.trim().split(' ');
			if (info[0] === 'in' && info.length > 1) {
				let c = info[1].charAt(0);
				if (!inCarriers.includes(c)) {
					lines.splice(idx, 1);
					inCarriers.push(c);
					if (!carriers.includes(c)) carriers.push(c);
				}
			}
		});
		return inCarriers;
	}
	else return [];
}


function getHeaders (file){
	let headers = [];
	if (file) {
		lines = file.split('\n');
		headers = lines.splice(0, lines.findIndex(ln => ln.split(' ')[0] === 'in'));
	} else {
		headers = [
			';!knitout-2', 
			`;;Machine: Kniterate`, 
			`;;Carriers: 1 2 3 4 5 6`
		];
	}

	console.log('headers are', headers);
	return headers;
}

function findMinMax (file) {
	//the part of the code that finds the min and max needle
	if (file) {
		let needles = new Set();

		for (let i = 0; i < lines.length; ++i) {
			let info = lines[i].trim().split(' ');
			if (info[0].charAt(0) !== ';' && info.length > 1) {
				if(info[0] === "knit"){
					let needle = Number(removeComment(info[2].slice(1)));
					needles.add(needle);
				}

				else if(info[0] === "xfer"){
					let needle = Number(removeComment(info[2].slice(1)));
					needles.add(needle);
				}
			}

		}

		const needleArr = Array.from(needles);
		let minVal = Math.min(...needleArr);
 		let maxVal = Math.max(...needleArr);

 		console.log('minval is', minVal, 'maxval is', maxVal)
 		return [minVal, maxVal]
 	}

 	else return [0,0]
}


function addWasteSection (file) {
	rollerAdvance = defaultRollerAdvance;
	stitchNumber = defaultStitchNumber;
	speedNumber = defaultSpeedNumber;
	wasteCarrier = defaultWasteCarrier;
	drawCarrier = defaultDrawCarrier;
	castonStyle = defaultCastonStyle;

	// all carriers start on LHS
	let carrierStates = {
		'1': "L",
		'2': "L",
		'3': "L",
		'4': "L",
		'5': "L",
		'6': "L"
	}

	// add kniterate prefix
	let wasteSection = [
		`x-roller-advance ${rollerAdvance}`, 
		`x-stitch-number ${stitchNumber}`, 
		`x-speed-number ${speedNumber}`
	];

	let negCarriers = []
	let outCarriers = [];

	let header = getHeaders(file);
	inCarriers = getInCarriers(file);
	console.log('got incarriers', inCarriers)

	if (inCarriers.length > 0) castonCarrier = inCarriers[0];

	[minN, maxN] = findMinMax(file);

	let otherCarriers = carriers.filter(c => c !== wasteCarrier && c !== drawCarrier && c !== castonCarrier);

	// from R-L by default
	let castonDir = '-'; let drawDir = '-'; let wasteDir = '-'

	//get the castondir of the file
	if (inCarriers.includes(castonCarrier)) { //empty if !file, so will skip
		for (let i = 0; i < lines.length; ++i) {
			let info = lines[i].trim().split(' ');
			if (info.length > 1 && !info[0].includes(';')) {
				if (info[info.length - 1] === castonCarrier) {
					if (info[1] === '+') {
						castonDir = '-';
						break;
					} else if (info[1] === '-') {
						castonDir = '+';
						break;
					}
				}
			}
		}
	}

	if (drawCarrier === castonCarrier) {
		castonDir === '+' ? drawDir = '-' : drawDir = '+';
	}

	else {
		if (inCarriers.includes(drawCarrier)) {
			for (let i = 0; i < lines.length; ++i) {
				let info = lines[i].trim().split(' ');
				// replace this bit
				if (info.length > 1 && !info[0].includes(';')) {
					if (info[info.length - 1] === drawCarrier) {
						if (info[1] === '+') {
							drawDir = '-';
							break;
						} else if (info[1] === '-') {
							drawDir = '+';
							break;
						}
					}
				}
			}
		}
	}

	if (wasteCarrier === drawCarrier) {
		drawDir === '+' ? wasteDir = '-' : wasteDir = '+';
	}

	else if (wasteCarrier === castonCarrier) {
		castonDir === '+' ? wasteDir = '-' : wasteDir = '+';
	}

	else {
		if (inCarriers.includes(wasteCarrier)) {
			for (let i = 0; i < lines.length; ++i) {
				let info = lines[i].trim().split(' ');
				if (info.length > 1 && !info[0].includes(';')) {
					if (info[info.length - 1] === wasteCarrier) {
						if (info[1] === '+') {
							wasteDir = '-';
							break;
						} else if (info[1] === '-') {
							wasteDir = '+';
							break;
						}
					}
				}
			}
		}
	}

	console.log('draw dir', drawDir)

	if (drawDir === '-' && drawCarrier !== wasteCarrier) {
		negCarriers.push(drawCarrier);
	}

	console.log(castonDir)
	if (castonDir === '-' && castonCarrier !== wasteCarrier && castonCarrier !== drawCarrier) {
		negCarriers.push(castonCarrier);
	}

	if (lines && otherCarriers.length) {
		for (let c = 0; c < otherCarriers.length; ++c) {
			for (let i = 0; i < lines.length; ++i) {
				let info = lines[i].trim().split(' ');
				if (info.length > 1 && !info[0].includes(';')) {
					if (info[info.length - 1] === otherCarriers[c]) {
						if (info[1] === '-') {
							negCarriers.push(otherCarriers[c]);
							break;
						} else if (info[1] === '-') break;
					}
				}
			}
		}
	}



	width = maxN - minN + 1;
	if (width < 20) {
		minN >= (20 - width) ? ((wasteMin = minN - (20 - width)), (wasteMax = maxN)) : ((wasteMin = minN), (wasteMax = maxN + (20-width)));
	} else {
		wasteMin = minN;
		wasteMax = maxN;
	}
	let toDrop = [];


	if (!carriers.includes(castonCarrier)) carriers.push(castonCarrier);
	if (!carriers.includes(wasteCarrier)) carriers.push(wasteCarrier);
	if (!carriers.includes(drawCarrier)) carriers.push(drawCarrier);

	otherCarriers.forEach(carrier => {
		if (!carriers.includes(carrier)) carriers.push(carrier);
	})


	// todo: potentially always start on lhs to tuck yarns in?
	// and then need to bring in from the right? or the left.

	// process
	// find from state where carrier is
	// order direction accordingly
	// 2 rows of f/b of each

	console.log('initialising carriers', carriers, negCarriers)
	wasteSection.push(`;initialize yarns`);
	for (let i = 0; i < carriers.length; ++i) {
		wasteSection.push(`in ${carriers[i]}`);

		let bed = 'f';
		for (let n = wasteMin; n <= wasteMax; ++n) {
			if (Math.abs(n) % carriers.length === i) {
				wasteSection.push(`tuck + ${bed}${n} ${carriers[i]}`);
				bed === 'f' ? bed = 'b' : bed = 'f';
			} 

			else {
				if (n === wasteMax) wasteSection.push(`miss + ${bed}${n} ${carriers[i]}`);
			}

			if (i === 0) {
				if (n < minN || n > maxN) toDrop.push(n);
			}
		}

		bed = 'b';
		for (let n = wasteMax; n >= wasteMin; --n) {
			if (Math.abs(n) % carriers.length === i) {
				wasteSection.push(`tuck - ${bed}${n} ${carriers[i]}`);
				bed === 'f' ? bed = 'b' : bed = 'f';
			} else {
				if (n === wasteMin) wasteSection.push(`miss - ${bed}${n} ${carriers[i]}`);
			}
		}

		if (negCarriers.includes(carriers[i])) {
			let bed = 'f';
			for (let n = wasteMin; n <= wasteMax; ++n) {
				if (Math.abs(n) % carriers.length === i) {
					wasteSection.push(`tuck + ${bed}${n} ${carriers[i]}`);
					bed === 'f' ? bed = 'b' : bed = 'f';
				} else {
					if (n === wasteMax) wasteSection.push(`miss + ${bed}${n} ${carriers[i]}`);
				}
				if (i === 0) if (n < minN || n > maxN) toDrop.push(n);
			}
		}
	}

	// waste section
	wasteSection.push(`;waste yarn section`);
	for (let p = 0; p < wastePasses; ++p) {

		// even numbered rows in +ve direction
		if (p % 2 === 0) {
			for (let n = wasteMin; n <= wasteMax; ++n) {
				if (n % 2 === 0) {
					wasteSection.push(`knit + f${n} ${wasteCarrier}`);
				} else {
					wasteSection.push(`knit + b${n} ${wasteCarrier}`);
				}
			}
		} 

		// odd numbered rows in -ve direction
		else {
			for (let n = wasteMax; n >= wasteMin; --n) {
				if (n % 2 === 0) {
					wasteSection.push(`knit - b${n} ${wasteCarrier}`);
				} else {
					wasteSection.push(`knit - f${n} ${wasteCarrier}`);
				}
			}
		}
	}


	// bring in the cast-on carrier
	for (let n = wasteMax; n >= wasteMin; --n) {
		if (n % 2 === 0) {
			wasteSection.push(`knit - b${n} ${castonCarrier}`);
		} else {
			wasteSection.push(`knit - f${n} ${castonCarrier}`);
		}
	}

	// 5 rows of alternating front/back
	// nb -- rev direction after drawthread intro
	for (let p = 0; p < 5; ++p) {
		if (p % 2 === 1) {
			for (let n = wasteMin; n <= wasteMax; ++n) {
				wasteSection.push(`knit + f${n} ${wasteCarrier}`);
			}
		} else {
			for (let n = wasteMax; n >= wasteMin; --n) {
				wasteSection.push(`knit - b${n} ${wasteCarrier}`);
			}
		}
	}

	// bring in the draw thread
	for (let n = wasteMax; n >= wasteMin; --n) {
		if (n % 2 === 0) {
			wasteSection.push(`knit - b${n} ${drawCarrier}`);
		} else {
			wasteSection.push(`knit - f${n} ${drawCarrier}`);
		}
	}


	// 2 rows of alternating front/back
	// nb-- needs to be -ve direction after
	for (let p = 0; p < 2; ++p) {
		if (p % 2 === 0) {
			for (let n = wasteMin; n <= wasteMax; ++n) {
				wasteSection.push(`knit + f${n} ${wasteCarrier}`);
			}
		} else {
			for (let n = wasteMax; n >= wasteMin; --n) {
				wasteSection.push(`knit - b${n} ${wasteCarrier}`);
			}
		}
	}


	if (wasteDir === '+') {
		for (let n = wasteMin; n <= wasteMax; ++n) {
			wasteSection.push(`knit + f${n} ${wasteCarrier}`);
		}
	}
	if (!inCarriers.includes(wasteCarrier) && wasteCarrier !== drawCarrier && wasteCarrier !== castonCarrier) {
		if (wasteDir === '-') wasteSection.push(`out ${wasteCarrier}`); //*
		else {
			wasteSection.push(`miss + f${maxN + 4} ${wasteCarrier}`);
			outCarriers.push(wasteCarrier);
		}
	}

	// drop any extra needles if width < 20
	if (toDrop.length) {
		for (let n = 0; n < toDrop.length; ++n) {
			wasteSection.push(`drop f${toDrop[n]}`);
		}
	}

	// drop all needles on back bed
	for (let n = wasteMin; n <= wasteMax; ++n) {
		wasteSection.push(`drop b${n}`);
	}

	// draw thread
	wasteSection.push(`;draw thread`);
	if (drawDir === '-') {
		for (let n = minN; n <= maxN; ++n) {
			wasteSection.push(`knit + f${n} ${drawCarrier}`);
		}
	} else {
		for (let n = maxN; n >= minN; --n) {
			wasteSection.push(`knit - f${n} ${drawCarrier}`);
		}
	}


	if (!inCarriers.includes(drawCarrier) && drawCarrier !== castonCarrier) {
		if (drawDir === '-') wasteSection.push(`out ${drawCarrier}`); //*
		else {
			wasteSection.push(`miss + f${maxN + 4} ${drawCarrier}`);
			outCarriers.push(drawCarrier);
		}
	}

	//tube style cast on
	if (castonStyle !== 0) {
		wasteSection.push(`;cast-on`);
		if (castonStyle === 1) {
			wasteSection.push('rack 0.5'); // or 0.5 ? (visualizer)
			if (castonDir === '+') {
				for (let n = minN; n <= maxN; ++n) {
					wasteSection.push(`knit + f${n} ${castonCarrier}`, `knit + b${n} ${castonCarrier}`);
				}
			} else {
				for (let n = maxN; n >= minN; --n) {
					wasteSection.push(`knit - f${n} ${castonCarrier}`, `knit - b${n} ${castonCarrier}`);
				}
			}
			wasteSection.push(`rack 0`);
		} else {
			wasteSection.push('rack 0.5'); // or 0.5 ? (visualizer)
			if (castonDir === '-') { // ??
				for (let n = minN; n <= maxN; ++n) {
					wasteSection.push(`knit + f${n} ${castonCarrier}`, `knit + b${n} ${castonCarrier}`);
				}
			} else {
				for (let n = maxN; n >= minN; --n) {
					wasteSection.push(`knit - f${n} ${castonCarrier}`, `knit - b${n} ${castonCarrier}`);
				}
			}
			wasteSection.push(`rack 0`);
		}
		if (!inCarriers.includes(castonCarrier)) {
			if (castonDir === '-') wasteSection.push(`out ${castonCarrier}`); //*
			else {
				wasteSection.push(`miss + f${maxN + 4} ${castonCarrier}`);
				outCarriers.push(castonCarrier);
			}
		}
	}

	if (outCarriers.length) {
		for (let i = 0; i < outCarriers.length; ++i) {
			wasteSection.push(`out ${outCarriers[i]}`);
		}
	}

	let xfers = [];

	if (castonDir === "-"){
		for (let n = minN; n <= maxN; ++n) {
			xfers.push("xfer b"+n + " f"+n);
		}
	}

	else {
		for (let n = maxN; n >= minN; --n) {
			xfers.push("xfer b" + n + " f"+n);
		}
	}

	lines = [...header, ...wasteSection, ...xfers, ...lines];

	lines = lines.join('\n');


	return lines;
}