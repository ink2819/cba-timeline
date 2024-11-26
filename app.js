$(document).ready(function() {
    // Create a vector from 1974 to 2024
    const years = Array.from({ length: 2024 - 1974 + 1 }, (_, i) => 1974 + i);

    const cardsContainer = $('#cardsContainer');
    let fineArtData = [];
    let exhibitionData = []; // Global variable for exhibition data

    // Load and parse the exhibitions CSV
    function loadExhibitionsFromCSV() {
        Papa.parse("https://raw.githubusercontent.com/ink2819/cba-timeline/refs/heads/main/exhibitions.csv", {
            download: true,
            header: true,
            complete: function(results) {
                exhibitionData = results.data; // Store exhibition CSV data globally
                populateExhibitionsByYear(exhibitionData);
                createExhibitionTimeline(exhibitionData); // Create the timeline bar chart
            }
        });
    }

    // Load and parse the fine art objects CSV
    function loadFineArtData() {
        Papa.parse("https://raw.githubusercontent.com/ink2819/cba-timeline/refs/heads/main/cba_fineart_object.csv", {
            download: true,
            header: true,
            complete: function(results) {
                fineArtData = results.data;
                createTimelineBarChart(fineArtData); // Generate timeline bar chart
            }
        });
    }

    // Populate exhibitions by year dynamically
    function populateExhibitionsByYear(data) {
        years.forEach(function(year) {
            const exhibitionsForYear = data.filter(item => item['Start Year'] == year);
            const exhibitionsHtml = exhibitionsForYear.map(exhibition => `<li>${exhibition['Exhibition Title']}</li>`).join("");

            const cardHtml = `
                <div class="card" data-year="${year}">
                    <div class="card-content">
                        <div class="icon"></div>
                        <h3 class="title">${year}</h3>
                        <div class="info">
                            <p>Information about the year ${year}</p>
                            <div class="exhibitions">
                                <h3>Exhibitions</h3>
                                <ul>${exhibitionsHtml}</ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            cardsContainer.append(cardHtml);
        });

        setupCardClickHandler();
        setupEventCardClickHandler();
    }

    // Set up click handler for the cards
    function setupCardClickHandler() {
        $('.card').click(function() {
            $('.card').removeClass('active');
            $(this).addClass('active');
            $('.expand').addClass('active');
            const year = $(this).data('year');
            const yearTitle = d3.select("#yearTitle"); 
            yearTitle.text(""); 
            yearTitle.text(year); 
            updateVisualizationForYear(year);
            updateExhibitionVisualizationForYear(year);
        });
    }



    function setupEventCardClickHandler() {
        $('.eventcard').click(function() {
            $('.eventcard').removeClass('active');
            $(this).addClass('active');
        });
    }

    // Update D3.js visualization for the selected year (Fine Art Objects)
    function updateVisualizationForYear(year) {
        const filteredData = fineArtData.filter(d => d['Creation dates'] == year);
        const colorScale = d3.scaleOrdinal()
            .domain([...new Set(fineArtData.map(d => d.obj_type))])
            .range(d3.schemeCategory10);

        const leftViz = d3.select("#left-viz");
        leftViz.selectAll("svg").remove();

        const svg = leftViz.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
        
        const rectWidth = 30;
        const rectHeight = 40;
        const padding = 20;
        const numPerRow = Math.floor(svg.node().clientWidth / (rectWidth + padding));

        svg.selectAll("rect")
            .data(filteredData)
            .enter()
            .append("rect")
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("x", (d, i) => (i % numPerRow) * (rectWidth + padding))
            .attr("y", (d, i) => Math.floor(i / numPerRow) * (rectHeight + padding))
            .attr("fill", d => colorScale(d.obj_type))
            .on("mouseover", function(event, d) {
                d3.select("#object-title").text(d.title);
                d3.select("#object-type").text('Object Type: ' + d.obj_type);
                d3.select("#creator").text(d['created by'] || 'Unknown creator');
                d3.select("#description").text(d.Description);
            });
    }

    // Update exhibition visualization for the selected year
    function updateExhibitionVisualizationForYear(year) {
        const filteredExhibitions = exhibitionData.filter(d => d['Start Year'] == year);
        const rightExhibitionViz = d3.select("#right-exhibition-cards");
        rightExhibitionViz.selectAll("svg").remove();

        const svg = rightExhibitionViz.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
        
        const rectWidth = 40;
        const rectHeight = 50;
        const padding = 20;
        const numPerRow = Math.floor(svg.node().clientWidth / (rectWidth + padding));

        svg.selectAll("rect")
            .data(filteredExhibitions)
            .enter()
            .append("rect")
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("x", (d, i) => (i % numPerRow) * (rectWidth + padding))
            .attr("y", (d, i) => Math.floor(i / numPerRow) * (rectHeight + padding))
            .attr("fill", "orange")
            .on("mouseover", function(event, d) {
                d3.select("#exhibition-title").text(d['Exhibition Title']);
                d3.select("#exhibition-address").text(`Location: ${d['Street Address']}`);
                d3.select("#exhibition-date").text(`Exhibition Dates: ${d['Start Date']} - ${d['End Date']}`);
            })
        
    }
    function createTimelineBarChart(fineArtData) {
        // Aggregate data by year and object type count
        const countsByYearAndType = d3.rollups(
            fineArtData,
            v => d3.rollups(v, g => g.length, d => d.obj_type),
            d => d['Creation dates']
        );
    
        // Define the color scale for object types
        const colorScale = d3.scaleOrdinal()
            .domain([...new Set(fineArtData.map(d => d.obj_type))])
            .range(d3.schemeCategory10);
    
        // Set up the SVG dimensions
        const margin = { top: 50, right: 0, bottom: 30, left: 20 };
        const width = 1000 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
    
        // Create an SVG in the timeline-viz div
        const svg = d3.select(".timeline-viz").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("display", "block") 
            .style("margin", "0 auto")  
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
            .domain([0, 120])
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
    // Create a timeline bar chart of exhibition counts by year
    function createExhibitionTimeline(exhibitionData) {
        const exhibitionsByYear = d3.rollups(
            exhibitionData,
            v => v.length,
            d => d['Start Year']
        ).sort((a, b) => a[0] - b[0]);

        const years = exhibitionsByYear.map(d => d[0])
            .filter(year => year && !isNaN(year))  // Exclude null, undefined, or non-numeric years
            .sort((a, b) => a - b);
        const counts = exhibitionsByYear.map(d => d[1]);

        const margin = { top: 20, right: 0, bottom: 50, left: 50 };
        const width = 1000 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select(".exhibition-timeline-viz").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("display", "block") // Required for margin auto to work on SVG
            .style("margin", "0 auto")  // Center horizontally
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(years)
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(counts)])
            .nice()
            .range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickValues(years.filter((d, i) => i % 5 === 0)))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y).ticks(10));

        svg.selectAll(".bar")
            .data(exhibitionsByYear)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d[0]))
            .attr("y", d => y(d[1]))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d[1]))
            .attr("fill", "orange")
            .on("mouseover", function(event, d) {
                d3.select("#object-title").text(`Year: ${d[0]}, Exhibitions: ${d[1]}`);
            })
            .on("mouseout", function() {
                d3.select("#object-title").text("");
            });
    }

$(document).ready(function () {
    // Listen for clicks on event cards
    $(".eventcard").click(function () {
        const cardId = $(this).attr("id"); // Get the ID of the clicked card

        // Define content for each card
        let leftContent = "";
        let rightContent = "";

        if (cardId === "eventcard1") {
            // Content for event card 1
            leftContent = `
                <div class="cell">
                    <img src="https://www.centerforbookarts.net/exhibits/archive/catalogs/exh80/exh_80_cat_c1.jpg">
                </div>
                <div class="cell">
                    <img src="https://www.centerforbookarts.net/exhibits/archive/catalogs/exh80/exh_80_cat_p23.jpg">
                </div>`;
            rightContent = `
                <p>
                    Center for Book Arts: The First Decade is an exhibition at The New York Public Library which ran from September 7, 1984 - November 29, 1984. This exhibition, celebrating the tenth anniversary of the Center for Book Arts in New York, illustrates these movements in its display of 132 works by 112 artists, selected from the work of the Center's almost one thousand members. The exhibition is not intended as a retrospective but rather as an overview of members' diverse approaches to contemporary book art and, to a great degree, of their current interests.
                </p>`;
        } else if (cardId === "eventcard2") {
            // Content for event card 2
            leftContent = `
                <div class="cell">
                    <img src="https://images1.loopnet.com/i2/9osDD0JihqGljWk3jOZRmF1oC6BZggVgIY73uRhbaJo/110/image.jpg">
                </div>`;
            rightContent = `
                <p>
                    In 1984, the Center relocated to 626 Broadway, a short walk from the original location. In addition to a gallery, print shop, bindery, and library, the renovated space (over 5,000 square feet) included five private studios ranging in size from 100 to 250 square feet.
                </p>`;
        }

        // Populate the summary divs
        $("#event-left-info").html(leftContent);
        $("#event-right-info").html(rightContent);
    });
});
    // Initialize data loading
    loadExhibitionsFromCSV();
    loadFineArtData();
});

