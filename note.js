function createTimelineBarChart(data) {
    // Aggregate data by year and object type count
    const countsByYearAndType = d3.rollups(
        data,
        v => d3.rollups(v, g => g.length, d => d.obj_type),
        d => d['Creation dates']
    );

    // Define the color scale for object types
    const colorScale = d3.scaleOrdinal()
        .domain([...new Set(data.map(d => d.obj_type))])
        .range(d3.schemeCategory10);

    // Set up the SVG dimensions
    const margin = { top: 20, right: 0, bottom: 50, left: 50 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create an SVG in the timeline-viz div
    const svg = d3.select(".timeline-viz").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("display", "block") // Required for margin auto to work on SVG
        .style("margin", "0 auto")  // Center horizontally
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Flatten data and prepare for stacking
    const flattenedData = countsByYearAndType.flatMap(([year, types]) =>
        types.map(([type, count]) => ({ year, type, count }))
    );

    // Extract all unique years and types for the scales
    const years = [...new Set(flattenedData.map(d => d.year))]
        .filter(year => year && !isNaN(year))  // Exclude null, undefined, or non-numeric years
        .sort((a, b) => a - b);
    const types = [...new Set(flattenedData.map(d => d.type))];

    // Set up the x-axis and y-axis scales
    const x = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, 130])
        .nice()
        .range([height, 0]);

    // Set up the stack generator for object types
    const stack = d3.stack()
        .keys(types)
        .value((d, key) => d[key] || 0) // Use `0` if the type key is missing
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    // Prepare data in a format suitable for `d3.stack`
    const stackedData = stack(
        years.map(year => {
            const yearData = { year };
            flattenedData
                .filter(d => d.year === year)
                .forEach(d => yearData[d.type] = d.count);
            return yearData;
        })
    );

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickValues(years.filter((d, i) => i % 5 === 0))) // Show every 5th year for readability
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add stacked bars
    svg.selectAll("g.layer")
        .data(stackedData)
        .enter().append("g")
        .attr("class", "layer")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => x(d.data.year))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth());

}
Papa.parse("https://raw.githubusercontent.com/ink2819/cba-timeline/refs/heads/main/cba_fineart_object.csv", {
    download: true,
    header: true,
    complete: function(results) {
        const data = results.data;
        console.log("Loaded Data:", data); // Check the structure and fields
        setupD3Visualization(data); 
        createTimelineBarChart(data); // Generate timeline bar chart
    }
});    
