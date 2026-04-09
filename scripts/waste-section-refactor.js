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

// carrier object
//	{
//		id: ["1", "2", "3", "4", "5", "6"]
//		castOn: [false, true],
//		role: ["waste", draw", null]      
//		isMainYarn: [false, true],
//		dir: "+", 
//		position: [L, R] 
//	},


class CarrierSet {
	// position is always L at the start
	constructor(carriers) {
		this.carriers = carriers.map(c => ({ 
			position: "L", castOn: false, ...c }));
	}

	// roles -- need to know cast-on drawthread etc.
	// if there are duplicates here, need to change mode
	get castOn()     { return this.carriers.find(c => c.role === "castOn");}
	get drawThread() { return this.carriers.find(c => c.role === "drawThread");}
	get waste()      { return this.carriers.find(c => c.role === "waste");}
	get mainYarns()  { return this.carriers.filter(c => c.isMainYarn);}

	// lookup
	get(id) { return this.carriers.find(c => c.id === id); }

	// set the position (happens every row)
	setPosition(id, side) {
		this.carriers.find(c => c.id === id).position = side;
	}

	// set the direction they get introduced
	setDir(id, dir) {
		const carrier = this.carriers.find(c => c.id === id);
		if (!carrier) throw new Error(`Carrier ${id} not found`);
		carrier.dir = dir;
	}

	// change a carrier's role
	setRole(id, role) {
		const carrier = this.carriers.find(c => c.id === id);
		if (!carrier) throw new Error(`Carrier ${id} not found`);
		carrier.role = role;
	}

	// add a carrier to the carrier set
	push(carrier) {
	if (this.carriers.some(c => c.id === carrier.id)) {
		throw new Error(`Carrier ${carrier.id} already exists`);
	}
		this.carriers.push({ position: "L", ...carrier });
	}
}

function removeComment(str) {
	if (str.includes(';')) return str.slice(0, str.indexOf(';'));
	else return str;
}

function getHeaders (file){
	if (lines.length > 0) {
		headers = lines.splice(0, lines.findIndex(ln => ln.split(' ')[0] === 'in'));
	} 

	else {
		headers = [
			';!knitout-2', 
			`;;Machine: Kniterate`, 
			`;;Carriers: 1 2 3 4 5 6`
		];
	}

	return headers;
}

function findMinMax (lines) {
	//the part of the code that finds the min and max needle
	if (lines.length > 0) {
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

		width = maxVal - minVal + 1;
		
		if (width < 20) {
			minN >= (20 - width) ? ((wasteMin = minVal - (20 - width)), (wasteMax = maxVal)) 
				: ((wasteMin = minVal), (wasteMax = maxVal + (20-width)));
		} else {
			wasteMin = minVal;
			wasteMax = maxVal;
		}


		return [minVal, maxVal, wasteMin, wasteMax]
	}

	else return [0,0]
}


function parseMainYarns(lines) {
	const carriers = new CarrierSet([]);
	if (lines.length > 0) {
		// First line is always the cast-on
		console.log(lines[0])
		const castOnId = lines[0].split(' ')[1].charAt(0);
		carriers.push({ id: castOnId, role: null, castOn: true, isMainYarn: true });
		lines.shift();

		lines.forEach((ln, idx) => {
		const info = ln.trim().split(' ');

		// Carrier introduced with 'in' command
		if (info[0] === 'in' && info.length > 1) {
			const id = info[1].charAt(0);
			if (!carriers.get(id)) {
			carriers.push({ id, role: null, castOn: false, isMainYarn: true });
			lines.splice(idx, 1);
			}
		}

		// First stitch for this carrier — capture direction
		if (info.length > 2 && !info[0].includes(';')) {
			const id = info[info.length - 1];
			const carrier = carriers.get(id);
			if (carrier && !carrier.dir) {
				carriers.setDir(id, info[1]); // "+" or "-"
			}
		}
	  });
	}
	return carriers;
}

// need a function that decides the mode based on if
// there are waste and draw threads in the in-carriers
function setMode(inCarriers, drawCarrier, ) {

}

function makeCarriers({ castOn, drawThread, waste, mainYarns }) {
	const state = {};
	const allEntries = [castOn, drawThread, waste, ...mainYarns];
	for (const c of allEntries) state[c.id] = { 
		dir: c.dir, 
		endsAt: c.endsAt, 
		reusedInSample: c.reusedInSample ?? false };
		return new CarrierSet(
			{
				castOn: castOn.id, 
				drawThread: drawThread.id, 
				waste: waste.id, 
				mainYarnIds: mainYarns
			},
			state
		);
}

function generateTransfers(carrierSet) {
	return [];
}


function generateWasteSection(carrierSet) {
	let wasteSection = []
	wasteSection.push(`;initialize yarns`);
	console.log(carrierSet.carriers)
	carrierSet.carriers.forEach( (carrier, i) => {
		wasteSection.push(`in ${carrier.id}`);
		let bed = 'f';

		// tuck each carrier in turn
		for (let n = wasteMin; n <= wasteMax; ++n) {
			if (Math.abs(n) % carrierSet.carriers.length === i) {
				wasteSection.push(`tuck + ${bed}${n} ${carrier.id}`);
				bed === 'f' ? bed = 'b' : bed = 'f';
			} 

			else {
				if (n === wasteMax) wasteSection.push(`miss + ${bed}${n} ${carrier.id}`);
			}

			if (i === 0) {
				if (n < minN || n > maxN) toDrop.push(n);
			}
		}

		bed = 'b';
		for (let n = wasteMax; n >= wasteMin; --n) {
			if (Math.abs(n) % carrierSet.carriers.length === i) {
				wasteSection.push(`tuck - ${bed}${n} ${carrier.id}`);
				bed === 'f' ? bed = 'b' : bed = 'f';
			} else {
				if (n === wasteMin) wasteSection.push(`miss - ${bed}${n} ${carrier.id}`);
			}
		}
	})

	return wasteSection;
}

function addWasteSection (file) {
	rollerAdvance = defaultRollerAdvance;
	stitchNumber = defaultStitchNumber;
	speedNumber = defaultSpeedNumber;
	wasteCarrier = defaultWasteCarrier;
	drawCarrier = defaultDrawCarrier;
	castonStyle = defaultCastonStyle;

	let lines = file.split('\n');
	let mode = "A" // normal mode

	// file setup
	const prefix = [
			`x-roller-advance ${rollerAdvance}`, 
			`x-stitch-number ${stitchNumber}`, 
			`x-speed-number ${speedNumber}`
	];

	let headers = [];
	if (file) {
		headers = lines.splice(0, lines.findIndex(ln => ln.split(' ')[0] === 'in'));
	} else {
		headers = [
			';!knitout-2', 
			`;;Machine: Kniterate`, 
			`;;Carriers: 1 2 3 4 5 6`
		];
	}

	// get the width of the sample
	[minN, maxN, wasteMin, wasteMax] = findMinMax(lines);

	// get in carriers and caston carrier
	let carrierSet = parseMainYarns(lines);
	
	// now add in drawthread and waste yarn
	// check if they match
	if(carrierSet.carriers.some(c => c.id === drawCarrier)){
		window.alert(`main carriers can't be the same as draw thread (${drawCarrier})`)
		carrierSet.setRole(drawCarrier, "draw");
		mode = "B"; // draw thread included in main yarns
	}

	else {
		carrierSet.push({ 
			id: drawCarrier, 
			role: "drawThread", 
			isMainYarn: false, 
			dir: "+"
		})
	}

	// check waste carrier
	if(carrierSet.carriers.some(c => c.id === wasteCarrier)){
		window.alert(`main carriers can't be the same as waste yarn (${wasteCarrier})`)
		// right now draw and waste can't match- 
		//but could set a check for this in future
		carrierSet.setRole(wasteCarrier, "waste");

		if (mode === "B") mode = "D" // both
		else mode = "C" // waste thread included in main yarns
	}
	else {
		carrierSet.push({ 
			id: wasteCarrier, 
			role: "waste", 
			isMainYarn: false, 
			dir: "+"
		})
	}

	const waste = generateWasteSection(carrierSet);
	console.log(waste);
	const xfers = generateTransfers(carrierSet);

	lines = [...headers, ...waste, ...xfers, ...lines];
	output = lines.join('\n');

	return output;
}