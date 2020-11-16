// https://github.com/analyzer2004/svgtable
// Copyright 2020 Eric Lo
class SVGTable {
    constructor(svg, container) {
        this._svg = svg;
        this._container = container || svg;
        this._g = this._container.append("g");

        this._defaultColumnWidth = 100;
        this._cellHeight = 24;
        this._cellPadding = 10;
        this._fixedColumns = 0;
        this._fixedRows = 0;

        this._left = 0;
        this._top = 0;
        this._width = 400;
        this._height = 300;
        this._sliderWidth = 13;
        this._sliderLength = 50;

        this._xf = 1; // horizontal content to scroll factor
        this._yf = 1; // vertical content to scroll factor
        this._minY = 0; // minimum y of the content can be scrolled
        this._fixedWidth = 0;
        this._fixedHeight = 0;

        this._data = null;
        this._columns = null;
        this._defaultNumberFormat = "$,.2f";

        this._scrollbar = {
            horizontal: null,
            vertical: null
        };

        this._style = {
            border: true,
            borderColor: "#aaa",
            textColor: "black",
            background: "white",
            headerBackground: "#ddd",
            fixedBackground: "#eee",
            highlight: "cross", // none, cell, cross
            highlightBackground: "#fff3b0"
        };

        this._table = null;
        this._header = null;
        this._body = null;
        this._dataArea = null;
        this._dataHeader = null;

        this._focus = null;
        this._onhighlight = null;

        this._uniqueId = new String(Date.now() * Math.random()).replace(".", "");        
    }

    defaultColumnWidth(_) {
        return arguments.length ? (this._defaultColumnWidth = +_, this) : this._defaultColumnWidth;
    }

    cellHeight(_) {
        return arguments.length ? (this._cellHeight = +_, this) : this._cellHeight;
    }

    cellPadding(_) {
        return arguments.length ? (this._cellPadding = +_, this) : this._cellPadding;
    }

    fixedColumns(_) {
        return arguments.length ? (this._fixedColumns = +_, this) : this._fixedColumns;
    }

    fixedRows(_) {
        return arguments.length ? (this._fixedRows = +_, this) : this._fixedRows;
    }

    extent(_) {
        return arguments.length ? (
            this._left = +_[0][0], this._top = +_[0][1],
            this._width = +_[1][0], this._height = +_[1][1], this) : [[this._left, this._top], [this._width, this._height]];
    }

    size(_) {
        return arguments.length ? (this._width = +_[0], this._height = +_[1], this) : [this._width, this._height];
    }

    style(_) {
        return arguments.length ? (this._style = Object.assign(this._style, _), this) : this._style;
    }

    data(_) {
        return arguments.length ? (this._data = _, this) : this._data;
    }

    columns(_) {
        if (arguments.length) {
            this._columns = _;
            return this;
        }
        else {
            if (!this._columns && this._data) this._processColumns();
            return this._columns;
        }
    }

    defaultNumberFormat(_) {
        return arguments.length ? (this._defaultNumberFormat = _, this) : this._defaultNumberFormat;
    }

    onhighlight(_) {
        return arguments.length ? (this._onhighlight = _, this) : this._onhighlight;
    }

    render() {
        if (!this._validate()) {
            // error
        }
        else {
            this._processColumns();
            this._prepare();

            this._calcConstrains();
            this._createClipPaths();

            this._createTable();
            this._renderBody(this._table);
            this._renderHeader(this._table);
            this._addScrollbars();
        }
        return this;
    }

    getRowData(index) {
        return this._data[index];
    }

    getColumnData(index) {
        const c = this._columns[index];
        return this._data.map(_ => _[c.name]);
    }

    _validate() {
        return this._data && this._data.length > 0;
    }

    _prepare() {
        this._fixedHeight = this._cellHeight * this._fixedRows + this._cellHeight;        

        const w = this._sumWidth();
        const h = this._data.length * this._cellHeight;

        if (w < this._width) this._width = w;
        if (h < this._height) this._height = h;

        this._width -= this._sliderWidth;
        this._height -= this._sliderWidth;
    }
    
    _sumWidth(n) {
        // n === 0 : do not calculate, usually it is _fixedColumns = 0
        if (n === 0)
            return 0;
        else {
            // n === undefined : all columns
            const l = n || this._columns.length;
            var w = 0;
            for (let i = 0; i < l; i++) w += this._columns[i].width;
            return w;
        }
    }

    _processColumns() {
        if (!this._columns) {
            // CSV or JSON
            const keys = this._data.columns ? this._data.columns : Object.keys(this._data[0]);
            let x = 0;
            this._columns = keys.map(c => {
                const isNumber = typeof this._data[0][c] === "number";                
                const column = {
                    name: c,
                    isNumber: isNumber,
                    format: isNumber ? this._defaultNumberFormat : null,
                    order: 0, // 0: none, 1: ascending, 2: descending
                    x: x,
                    tx: x,
                    width: this._defaultColumnWidth
                }
                x += this._defaultColumnWidth;
                return column;
            });
        }
        else {
            let x = 0;
            this._columns.forEach(column => {                
                column.width = column.width || this._defaultColumnWidth;                
                column.x = x;
                column.tx = x;
                x += column.width;
            });
        }

        this._fixedWidth = this._sumWidth(this._fixedColumns);
        for (let i = this._fixedColumns; i < this._columns.length; i++) {
            const c = this._columns[i];
            c.tx = c.x - this._fixedWidth; // x for translate
        }

        this._columns.resetOrder = (except) => this._columns.forEach(c => { if (except && c !== except || !except) c.order = 0; }); 
    }

    _createClipPaths() {
        const addClipPath = (id, width, height, x, y) => {
            const cp = this._g.append("clipPath")
                .attr("id", `${id}.${this._uniqueId}`)
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            if (x) cp.attr("x", x);
            if (y) cp.attr("y", y);
        }

        addClipPath("bodyClip", this._width, this._height);
        addClipPath("headerRowClip", this._width - this._fixedWidth, this._fixedHeight + 1, null, -1);
        this._columns.forEach((column, i) => {
            addClipPath("headerClip" + i, column.width - this._cellPadding, this._cellHeight);
            if (column.isNumber)
                addClipPath("cellClip" + i, column.width - this._cellPadding, this._cellHeight, -(column.width - this._cellPadding));
            else
                addClipPath("cellClip" + i, column.width - this._cellPadding, this._cellHeight);
        })
    }

    _clipPath(id) {
        return `url(#${id}.${this._uniqueId})`;
    }

    _createTable() {
        // table container
        this._table = this._g.append("g")
            .attr("transform", `translate(${this._left},${this._top})`)
            .on("wheel", e => this._scroll(e))
            .on("mousewheel", e => this._scroll(e))
            .on("DOMMouseScroll", e => this._scroll(e));
    }

    _renderBody() {
        const that = this, style = this._style,
            highlight = style.highlight !== "none",
            cross = style.highlight === "cross";

        // table body container
        const bodyBox = this._table.append("g").attr("clip-path", this._clipPath("bodyClip"));
        // inner container of the table body, y is controlled by vertical scrollbar and its content is clipped by bodyClip  
        // it contains two parts: dataArea which is horizontally moveable and fixed columns on the left
        const body = bodyBox.append("g").attr("transform", `translate(0,${this._fixedHeight})`);
        // container of the moveable part of the body
        const dataArea = body.append("g")
            .attr("transform", `translate(${this._fixedWidth},0)`);
            

        const rows = this._data.slice(this._fixedRows);
        // moveable part of the body, x is controlled by horizontal scrollbar
        const cell = this._addRows(
            dataArea,
            "row",
            () => rows,
            (d, i) => this._columns.slice(this._fixedColumns).map((c, j) => {
                return {
                    rowIndex: i + this._fixedRows,
                    columnIndex: j + this._fixedColumns,
                    value: d[c.name]
                }
            }),
            (d, i) => `translate(0,${i * this._cellHeight})`,
            (d, i) => `translate(${this._columns[i + this._fixedColumns].tx},0)`,
            g => this._addCell(g, style.background, d => d.value, this._fixedColumns))
            .on("click", click)
            .on("mouseover", mouseover)
            .on("mouseleave", mouseleave);

        // fixed columns on the left
        const fixedCell = this._addRows(
            body.append("g"),
            "row",
            () => rows.map((r, i) => this._columns.slice(0, this._fixedColumns).map((c, j) => ({
                origin: r, // for sort to get the index of data
                rowIndex: i + this._fixedRows,
                columnIndex: j,
                value: r[c.name]
            }))),
            d => d,
            (d, i) => `translate(0,${i * this._cellHeight})`,
            (d, i) => `translate(${this._columns[i].tx},0)`,
            g => this._addCell(g, style.fixedBackground, d => d.value, 0));

        this._body = body;
        this._dataArea = dataArea;

        const test = cross ?
            (d, cell) => cell.rowIndex === d.rowIndex || cell.columnIndex === d.columnIndex :
            (d, cell) => cell.rowIndex === d.rowIndex && cell.columnIndex === d.columnIndex;

        d3.select("body").on(`keydown.eric.svgtable.${this._uniqueId}`, keypress);

        function keypress(e) {                 
            if (e.key === "Escape") that._focus = null;
        }

        function click(e, d) {
            if (that._focus !== d) {
                that._focus = null;
                mouseover(e, d);
                that._focus = d;
            }
            else 
                that._focus = null;
        }

        function mouseover(e, d) {
            if (!highlight || that._focus) return;

            const r = cell.select("rect")
                .datum(cell => test(d, cell) ? style.highlightBackground : style.background)
                .attr("fill", d => d);
            if (!that._style.border) r.attr("stroke", d => d);

            fixedCell.select("text").attr("font-weight", cell => cell.rowIndex === d.rowIndex ? "bold" : "");
            that._dataHeader.selectAll("text").attr("font-weight", cell => cell.columnIndex === d.columnIndex ? "bold" : "");

            if (that._onhighlight) {
                const c = that._columns[d.columnIndex];
                that._onhighlight({
                    cell: d,
                    column: c,
                    getRow: () => that.getRowData(d.rowIndex),
                    getColumn: () => that.getColumnData(d.columnIndex)
                });
            }
        }

        function mouseleave() {
            if (!highlight || that._focus) return;

            const r = cell.select("rect").attr("fill", style.background);
            if (!that._style.border) r.attr("stroke", style.background);

            fixedCell.select("text").attr("font-weight", "");
            that._dataHeader.selectAll("text").attr("font-weight", "");
        }
    }

    _renderHeader(g) {
        const style = this._style;

        // fixed rows sliced from this._data
        const rows = this._data.slice(0, this._fixedRows);
        // header container
        const header = g.append("g");
        // top-left cells which are always fixed if fixedColumns is specified
        header.selectAll(".column")
            .data(this._columns.slice(0, this._fixedColumns).map((d, i) => {
                d.columnIndex = i;
                return d;
            }))
            .join("g")
            .attr("class", "column")
            .attr("transform", (d, i) => `translate(${this._columns[i].tx},0)`)
            .call(g => this._addCell(g, style.headerBackground, d => d.name, 0, true))
            .on("click", (e, d) => this._sort(d));

        // fixed data cells for top-left part
        this._addRows(
            header,
            "fixedRow",
            () => rows.map((r, i) => this._columns.slice(0, this._fixedColumns).map((c, j) => ({
                rowIndex: i,
                columnIndex: j,
                value: r[c.name]
            }))),
            d => d,
            (d, i) => `translate(0,${(i + 1) * this._cellHeight})`,
            (d, i) => `translate(${this._columns[i].tx},0)`,
            g => this._addCell(g, style.fixedBackground, d => d.value, 0));

        // the container of the rest of the header cells, its content is clipped by headerClip
        const headerBox = header.append("g")
            .attr("clip-path", this._clipPath("headerRowClip"))
            .attr("transform", `translate(${this._fixedWidth},0)`);

        // horizontally moveable part of the header, x is controlled by and synchronized with horizontal scrollbar
        const dataHeader = headerBox.append("g");
        dataHeader.selectAll(".column")
            .data(this._columns.slice(this._fixedColumns).map((d, i) => {
                d.columnIndex = i + this._fixedColumns;
                return d;
            }))
            .join("g")
            .attr("class", "column")            
            .attr("transform", (d, i) => `translate(${this._columns[i + this._fixedColumns].tx},0)`)
            .call(g => this._addCell(g, style.headerBackground, d => d.name, this._fixedColumns, true))
            .on("click", (e, d) => this._sort(d));

        this._addRows(
            dataHeader,
            "fixedRow",
            () => rows,
            (d, i) => this._columns.slice(this._fixedColumns).map((c, j) => {
                return {
                    rowIndex: i,
                    columnIndex: j + this._fixedColumns,
                    value: d[c.name]
                }
            }),
            (d, i) => `translate(0,${(i + 1) * this._cellHeight})`,
            (d, i) => `translate(${this._columns[i + this._fixedColumns].tx},0)`,
            g => this._addCell(g, style.fixedBackground, d => d.value, this._fixedColumns)
        );

        // a fixed line for seperating header and body
        g.append("line")
            .attr("stroke", style.borderColor)
            .attr("x1", 0)
            .attr("y1", this._cellHeight)
            .attr("x2", this._width)
            .attr("y2", this._cellHeight);

        this._header = header;
        this._dataHeader = dataHeader;
    }

    _sort(column) {
        const sorted = this._sortData(column);
        const f = 250 / sorted.length;
        this._table.selectAll(".row")
            .transition()
            .duration((d, i) => i * f)
            .ease(d3.easeBounce)
            .attr("transform", d => {                
                const i = Array.isArray(d) ? d.length ? sorted.indexOf(d[0].origin) : 0 : sorted.indexOf(d);
                return `translate(0,${i * this._cellHeight})`;
            });

        const cg = this._header.selectAll(".column");
        cg.select(".asc").attr("fill", d => column === d && column.order === 1 ? "#777" : "#bbb");
        cg.select(".desc").attr("fill", d => column === d && column.order === 2 ? "#777" : "#bbb");
    }

    _sortData(column) {
        var sorted = [...this._data].slice(this._fixedRows);

        this._columns.resetOrder(column);
        if (column.order === 0)
            column.order = 1;
        else if (column.order === 1)
            column.order = 2;
        else
            column.order = 1;

        if (column.isNumber) {
            if (column.order === 0)
                sorted.sort((a, b) => -1);
            else if (column.order === 1)
                sorted.sort((a, b) => a[column.name] - b[column.name]);
            else
                sorted.sort((a, b) => b[column.name] - a[column.name]);
        }
        else {
            if (column.order === 0)
                sorted.sort((a, b) => -1);
            else if (column.order === 1)
                sorted.sort((a, b) => a[column.name].localeCompare(b[column.name]));
            else
                sorted.sort((a, b) => b[column.name].localeCompare(a[column.name]));
        }

        return sorted;
    }

    // rows: data function for rows
    // columns: data function for columns
    // rt: row translate function
    // ct: column translate function
    // cell: cell function
    _addRows(g, className, rows, columns, rt, ct, cell) {
        return g.selectAll("." + className)
            .data(rows)
            .join("g")
            .attr("class", className)
            .attr("transform", rt)
            .selectAll(".cell")
            .data(columns)
            .join("g")
            .attr("class", "cell")
            .attr("transform", ct)
            .call(cell)
    }

    // base: number of fixed cells on the same row
    _addCell(g, fill, tf, base, isHeader) {
        const style = this._style;
        
        const rect = g.append("rect")
            .attr("width", (d, i) => this._columns[base + i].width)
            .attr("height", this._cellHeight)
            .attr("fill", fill)
            .attr("stroke", style.border ? style.borderColor : fill);

        const t = g.append("text").attr("dy", "1em").attr("fill", style.textColor);

        if (isHeader) {
            if (!style.border)
                g.append("line")
                    .attr("x1", (d, i) => this._columns[base + i].width - 1).attr("y1", 5)
                    .attr("x2", (d, i) => this._columns[base + i].width - 1).attr("y2", this._cellHeight - 5)
                    .attr("stroke", style.borderColor);

            this._arrow(g, base, "asc", "M 0 8 L 3 4 L 6 8");
            this._arrow(g, base, "desc", "M 0 11 L 3 15 L 6 11");

            // Header cell
            t.attr("dx", this._cellPadding)
                .attr("clip-path", (d, i) => this._clipPath(`headerClip${base + i}`))
                .text(d => tf(d));
        }
        else {
            t.attr("dx", (d, i) => this._columns[base + i].isNumber ? -this._cellPadding : this._cellPadding)
                .attr("clip-path", (d, i) => this._clipPath(`cellClip${base + i}`))
                .attr("transform", (d, i) => `translate(${this._columns[base + i].isNumber ? this._columns[base + i].width : 0},0)`)
                .attr("text-anchor", (d, i) => this._columns[base + i].isNumber ? "end" : "start")
                .text((d, i) => {
                    const format = this._columns[base + i].format;
                    return format ? d3.format(format)(tf(d)) : tf(d);
                });
        }
    }

    _arrow(g, base, name, path) {
        g.append("path")
            .attr("class", name)
            .attr("d", path)
            .attr("fill", "#bbb")
            .attr("transform", (d, i) => `translate(${this._columns[base + i].width - this._cellPadding - 10},2)`);
    }

    _addScrollbars() {
        this._addVScroll();
        this._addHScroll();
    }

    _addVScroll() {
        const sb = this._scrollbar.vertical = new Scrollbar(this._svg);
        sb.position(this._left + this._width, this._top + this._fixedHeight, this._height - this._fixedHeight)
            .sliderWidth(this._sliderWidth)
            .sliderLength(this._sliderLength)
            .onscroll((y, sy, delta) => this._body.attr("transform", `translate(0,${-sy * this._yf + this._fixedHeight})`))
            .attach();
    }

    _addHScroll() {
        const sb = this._scrollbar.horizontal = new Scrollbar(this._svg);
        sb.vertical(false)
            .position(this._left + this._fixedWidth, this._top + this._height, this._width - this._fixedWidth)
            .sliderWidth(this._sliderWidth)
            .sliderLength(this._sliderLength)
            .onscroll((x, sx, delta) => {
                this._dataArea.attr("transform", `translate(${-sx * this._xf + this._fixedWidth},0)`);
                this._dataHeader.attr("transform", `translate(${-sx * this._xf},0)`);
            })
            .attach();
    }

    _calcConstrains() {
        // f for both scrollbars = (total - visible) / (visible - slider length)    
        // Vertical scrollbar constrain        
        const th = (this._data.length - this._fixedRows) * this._cellHeight,
            sh = this._height - this._fixedHeight;
        this._yf = (th - sh) / (sh - this._sliderLength);

        // Horizontal scrollbar constrain
        const tw = this._sumWidth() - this._sumWidth(this._fixedColumns),
            sw = this._width - this._sumWidth(this._fixedColumns);
        this._xf = (tw - sw) / (sw - this._sliderLength);

        this._minY = -((this._data.length - this._fixedRows) * this._cellHeight - this._height);
    }

    _scroll(e) {
        const dy = e.wheelDeltaY ? e.wheelDeltaY : e.wheelDelta ? e.wheelDelta : -1;
        if (dy === -1) return;

        const cy = +this._body.attr("transform").split(",")[1].replace(")", "");
        var y = cy + dy;
        if (y < this._minY)
            y = this._minY;
        else if (y > this._fixedHeight)
            y = this._fixedHeight;

        this._body.attr("transform", `translate(0,${y})`);
        this._scrollbar.vertical.moveSlider(-(y - this._fixedHeight) / this._yf);
        e.preventDefault();
    }
}