const render = (data, field, cols, rows, style) => {
    d3.select("body").select("svg").remove();

    const svg = d3.select("body")
        .append("svg")
        .attr("width", 975)
        .attr("height", 610); 

    const table = new SVGTable(svg)
        .extent([[25, 25], [900, 400]])
        .fixedColumns(cols)
        .fixedRows(rows)
        .defaultColumnWidth(100)
        .defaultNumberFormat(",.0d")
        .style(style)
        .data(data)
        .onhighlight(c => {
            chart(c);
            map(c);
        });

    table.columns()[0].width = 160;
    table.render();

    const chart = miniChart(svg, 50, 435, 600, 125);
    const map = miniMap(svg, 700, 435, 200, 125);

    function miniMap(svg, x, y, width, height) {
        var g;

        const map = grid(data);

        const cols = d3.max(map.map(d => d.col)) + 1, rows = d3.max(map.map(d => d.row)) + 1;
        const sx = d3.scaleBand().domain(seq(cols)).range([0, width]),
            sy = d3.scaleBand().domain(seq(rows)).range([0, height]),
            sc = d3.scaleSequential(d3.interpolateBuPu);

        const bandwidth = ({ x: sx.bandwidth(), y: sy.bandwidth(), hx: sx.bandwidth() / 2, hy: sy.bandwidth() / 2 })
        g = svg.append("g").attr("transform", `translate(${x},${y})`);
        const caption = g.append("text")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("transform", `translate(${width / 2},${height + 35})`);

        update();

        function update(context) {
            if (context) {
                const cdata = context.getColumn();
                sc.domain(d3.extent(cdata.slice(1)));
                cdata.forEach((d, i) => {
                    const cell = map.find(m => m.rowIndex === i);
                    if (cell) cell.value = d;
                })
                caption.text(`${context.column.name} ${up(field)}`);
            }

            g.selectAll("rect")
                .data(map)
                .join("rect")
                .attr("fill", d => d.value ? sc(d.value) : "#ccc")
                .attr("width", bandwidth.y).attr("height", bandwidth.y)
                .attr("transform", d => `translate(${sx(d.col)},${sy(d.row)})`);
        }

        return update;
    }

    function miniChart(svg, x, y, width, height) {
        const columns = data.columns.slice(1);
        const sx = d3.scaleBand().domain(columns).range([0, width]);
        const sy = d3.scaleLinear()
            .domain(d3.extent(columns.map(c => data[0][c]))).nice()
            .range([height, 0]);

        const chart = svg.append("g").attr("transform", `translate(${x},${y})`);
        const caption = chart.append("text")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("transform", `translate(${width / 2},${height + 35})`);

        chart.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(sx));
        var axisY = chart.append("g").call(d3.axisLeft(sy).ticks(2, "s").tickValues(sy.domain()));

        function update(context) {
            axisY.remove();

            const rdata = context.getRow();

            caption.text(`${rdata["state"]} ${up(field)}`);
            const values = columns.map(c => rdata[c]);
            sy.domain(d3.extent(values)).nice();
            axisY = chart.append("g").call(d3.axisLeft(sy).ticks(2, "s").tickValues(sy.domain()));

            chart.selectAll(".bar")
                .data(values)
                .join("rect")
                .attr("class", "bar")
                .attr("fill", "#a8dadc")
                .attr("x", (d, i) => sx(columns[i]) + sx.bandwidth() / 4)
                .attr("y", d => sy(d))
                .attr("width", sx.bandwidth() / 2)
                .attr("height", d => height - sy(d));
        }

        return update;
    }

    function seq(n) {
        return Array.apply(null, { length: n }).map((d, i) => i);
    }

    function up(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}

const grid = data => {
    const states = [{ "State": "Alabama", "Code": "AL" }, { "State": "Alaska", "Code": "AK" }, { "State": "Arizona", "Code": "AZ" }, { "State": "Arkansas", "Code": "AR" }, { "State": "California", "Code": "CA" }, { "State": "Colorado", "Code": "CO" }, { "State": "Connecticut", "Code": "CT" }, { "State": "District of Columbia", "Code": "DC" }, { "State": "Delaware", "Code": "DE" }, { "State": "Florida", "Code": "FL" }, { "State": "Georgia", "Code": "GA" }, { "State": "Hawaii", "Code": "HI" }, { "State": "Idaho", "Code": "ID" }, { "State": "Illinois", "Code": "IL" }, { "State": "Indiana", "Code": "IN" }, { "State": "Iowa", "Code": "IA" }, { "State": "Kansas", "Code": "KS" }, { "State": "Kentucky", "Code": "KY" }, { "State": "Louisiana", "Code": "LA" }, { "State": "Maine", "Code": "ME" }, { "State": "Maryland", "Code": "MD" }, { "State": "Massachusetts", "Code": "MA" }, { "State": "Michigan", "Code": "MI" }, { "State": "Minnesota", "Code": "MN" }, { "State": "Mississippi", "Code": "MS" }, { "State": "Missouri", "Code": "MO" }, { "State": "Montana", "Code": "MT" }, { "State": "Nebraska", "Code": "NE" }, { "State": "Nevada", "Code": "NV" }, { "State": "New Hampshire", "Code": "NH" }, { "State": "New Jersey", "Code": "NJ" }, { "State": "New Mexico", "Code": "NM" }, { "State": "New York", "Code": "NY" }, { "State": "North Carolina", "Code": "NC" }, { "State": "North Dakota", "Code": "ND" }, { "State": "Ohio", "Code": "OH" }, { "State": "Oklahoma", "Code": "OK" }, { "State": "Oregon", "Code": "OR" }, { "State": "Pennsylvania", "Code": "PA" }, { "State": "Puerto Rico", "Code": "PR" }, { "State": "Rhode Island", "Code": "RI" }, { "State": "South Carolina", "Code": "SC" }, { "State": "South Dakota", "Code": "SD" }, { "State": "Tennessee", "Code": "TN" }, { "State": "Texas", "Code": "TX" }, { "State": "Utah", "Code": "UT" }, { "State": "Vermont", "Code": "VT" }, { "State": "Virginia", "Code": "VA" }, { "State": "Washington", "Code": "WA" }, { "State": "West Virginia", "Code": "WV" }, { "State": "Wisconsin", "Code": "WI" }, { "State": "Wyoming", "Code": "WY" }];
    const map = [[11, 0, "ME"], [0, 1, "AK"], [6, 1, "WI"], [10, 1, "VT"], [11, 1, "NH"], [1, 2, "WA"], [2, 2, "ID"], [3, 2, "MT"], [4, 2, "ND"], [5, 2, "MN"], [6, 2, "IL"], [7, 2, "MI"], [9, 2, "NY"], [10, 2, "MA"], [1, 3, "OR"], [2, 3, "NV"], [3, 3, "WY"], [4, 3, "SD"], [5, 3, "IA"], [6, 3, "IN"], [7, 3, "OH"], [8, 3, "PA"], [9, 3, "NJ"], [10, 3, "CT"], [11, 3, "RI"], [1, 4, "CA"], [2, 4, "UT"], [3, 4, "CO"], [4, 4, "NE"], [5, 4, "MO"], [6, 4, "KY"], [7, 4, "WV"], [8, 4, "VA"], [9, 4, "MD"], [10, 4, "DE"], [2, 5, "AZ"], [3, 5, "NM"], [4, 5, "KS"], [5, 5, "AR"], [6, 5, "TN"], [7, 5, "NC"], [8, 5, "SC"], [9, 5, "DC"], [0, 6, "HI"], [4, 6, "OK"], [5, 6, "LA"], [6, 6, "MS"], [7, 6, "AL"], [8, 6, "GA"], [4, 7, "TX"], [9, 7, "FL"]].map(d => ({ col: d[0], row: d[1], code: d[2] }));
    map.forEach(d => {
        const state = states.find(state => state.Code === d.code);
        if (state) {
            d.state = state.State;
            for (var i = 0; i < data.length; i++) {
                if (data[i]["state"] === d.state) {
                    d.rowIndex = i;
                    break;
                }
            }
        }
        else
            d.rowIndex = -1;
    })

    return map;
}