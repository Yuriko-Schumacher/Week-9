const margin = { t: 50, r: 50, b: 50, l: 50 };
const size = { w: 1000, h: 800 };
const svg = d3.select("svg#parallel");

svg.attr("width", size.w).attr("height", size.h);

const containerG = svg
	.append("g")
	.classed("container", true)
	.attr("transform", `translate(${margin.t}, ${margin.l})`);

const sankeySVG = d3
	.select("svg#sankey")
	.attr("width", size.w)
	.attr("height", size.h);
const sankeyG = sankeySVG
	.append("g")
	.classed("container", true)
	.attr("transform", `translate(${margin.t}, ${margin.l})`);
size.w = size.w - margin.l - margin.r;
size.h = size.h - margin.t - margin.b;

const columns = ["hp", "speed", "attack", "defense", "spAtk", "spDef", "total"];

d3.csv("data/Pokemon.csv", function (d) {
	return {
		name: d.Name,
		type: d["Type 1"],
		total: +d.Total,
		hp: +d.HP,
		attack: +d.Attack,
		defense: +d.Defense,
		spAtk: +d["Sp. Atk"],
		spDef: +d["Sp. Def"],
		speed: +d.Speed,
	};
}).then(function (data) {
	// console.log(data[0]);
	parallelCoordinates(data);

	let sankeyData = prepareSankeyData(data[0]);
	drawSankey(sankeyData);
});

function parallelCoordinates(data) {
	let types = new Set(data.map((d) => d.type));
	types = Array.from(types);

	let scales = {
		type: d3.scalePoint().domain(types).range([0, size.h]),
		// scales['type](value)

		// ORDINAL
		// [a, b, c, d] => [50, 100, 150, 200]
		// POINT
		// [a, b, c, d] => [0, 200]
	};

	// console.log(scales.type("Grass"));
	columns.forEach((column) => {
		let scale = d3
			.scaleLinear()
			.domain(d3.extent(data, (d) => d[column]))
			.range([0, size.h]);
		scales[column] = scale;
	});

	// console.log(scales);

	let xScale = d3.scalePoint().domain(Object.keys(scales)).range([0, size.w]);
	// console.log(Object.keys(scales));

	// draw x-axis
	containerG
		.append("g")
		.classed("axis-x", true)
		.attr("transform", `translate(0, ${size.h + 20})`)
		.call(d3.axisBottom(xScale)); // calling this function on the d3 selection

	// draw y-axes
	containerG
		.append("g")
		.selectAll("g")
		.data(Object.keys(scales)) // .data(xScale.domain())
		.join("g")
		.classed("parallel-axis", true)
		.each(function (d) {
			let g = d3.select(this); // value of 'this' would be different
			let scale = scales[d];
			let axis = d3.axisLeft(scale);
			g.attr("transform", `translate(${xScale(d)}, 0)`);
			g.call(axis);
		});

	let line = d3
		.line()
		.x((d) => d.x)
		.y((d) => d.y);

	containerG
		.append("g")
		.classed("lines", true)
		.selectAll("path")
		.data(data)
		.join("path")
		// .style("stroke", (d) => "orange")
		.attr("d", (pokemon) => {
			let columnNames = xScale.domain();
			let crossProd = d3.cross(columnNames, [pokemon], (key, value) => {
				// console.log("cross", key, value);
				let yScale = scales[key];
				let yValue = pokemon[key];
				let xValue = key;
				return {
					x: xScale(xValue),
					y: yScale(yValue),
				};
			});
			// console.log(crossProd);

			return line(crossProd);
		});
}

function prepareSankeyData(pokemon) {
	// needs a data set with nodes and lengths
	console.log(pokemon);
	let nodes = columns.map((d) => {
		return { name: d };
	});
	let links = columns
		.filter((d) => d !== "total")
		.map((d) => {
			return { source: "total", target: d, value: pokemon[d] };
		});
	// console.log(nodes, links);

	return { nodes: nodes, links: links };
}

function drawSankey(data) {
	console.log(data);
	let sankeyLayout = d3
		.sankey()
		// .nodeAlign(d3.sankyJustify()) // d3.leftAlign
		.nodeId((d) => d.name)
		.nodeWidth(15)
		.nodePadding(15)
		.extent([
			[0, 0], // origin
			[size.w, size.h], // bottom-right
		]);

	let sankey = sankeyLayout(data);
	console.log(sankey.links);
	sankeyG
		.selectAll("rect")
		.data(sankey.nodes)
		.join("rect")
		.attr("x", (d) => d.x0)
		.attr("y", (d) => d.y0)
		.attr("width", 15)
		.attr("height", (d) => d.y1 - d.y0);

	// adding the links
	sankeyG
		.selectAll("path")
		.data(sankey.links)
		.join("path")
		.attr("d", d3.sankeyLinkHorizontal())
		.attr("stroke-width", (d) => d.width);

	sankeyG
		.selectAll("text")
		.data(sankey.nodes)
		.join("text")
		.text((d) => d.name)
		.attr("transform", (d) => `translate(${d.x0}, ${d.y0}) rotate(90)`);
}
