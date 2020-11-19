// https://github.com/analyzer2004/svgtable
// Copyright 2020 Eric Lo
class SVGTable {
    constructor(svg, container) {
        this._svg = svg;
        this._container = container || svg;
        this._g = null;

        this._autoSizeCell = true;
        this._defaultColumnWidth = 100;
        this._cellHeight = 24; // user setting
        this._cellHeightA = 24; // actual cell height = cellHeight + cellPaddingV * 2
        this._cellPaddingH = 10;
        this._cellPaddingV = 3;
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
        this._dataIsArray = false;
        this._columns = null;
        this._defaultNumberFormat = "$,.2f";

        this._heatmap = false;
        this._heatmapPalette = null; // interpolator or array of colors
        this._heatmapColor = null;

        this._scrollbar = {
            horizontal: null,
            vertical: null,
            visible: [true, true]
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
        this._onclick = null;
        this._oncontextmenu = null;

        this._uniqueId = new String(Date.now() * Math.random()).replace(".", "");
    }

    defaultColumnWidth(_) {
        return arguments.length ? (this._defaultColumnWidth = +_, this) : this._defaultColumnWidth;
    }

    cellHeight(_) {
        return arguments.length ? (this._cellHeight = +_, this) : this._cellHeight;
    }

    cellPaddingH(_) {
        return arguments.length ? (this._cellPaddingH = +_, this) : this._cellPaddingH;
    }

    cellPaddingV(_) {
        return arguments.length ? (this._cellPaddingV = +_, this) : this._cellPaddingV;
    }

    autoSizeCell(_) {
        return arguments.length ? (this._autoSizeCell = _, this) : this._autoSizeCell;
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

    heatmap(_) {
        if (arguments.length) {
            this._heatmap = _;
            if (this._table) this._updateHeatmap();
            return this;
        }
        else
            return this._heatmap;
    }

    heatmapPalette(_) {
        if (arguments.length) {
            this._heatmapPalette = _;
            if (this._table) {
                this._processHeatmap();
                if (this._heatmap) this._updateHeatmap();
            }
            return this;
        }
        else
            return this._heatmapPalette;
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

    onclick(_) {
        return arguments.length ? (this._onclick = _, this) : this._onclick;
    }

    oncontextmenu(_) {
        return arguments.length ? (this._oncontextmenu = _, this) : this._oncontextmenu;
    }

    render() {
        if (!this._validate()) {
            // error
        }
        else {
            this._init();
            this._processColumns();
            this._prepare();

            this._calcConstrains();
            this._createClipPaths();

            this._processHeatmap();
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

    _init() {
        this._g = this._container.append("g");
        this._cellHeightA = this._cellHeight + this._cellPaddingV * 2;
    }

    _validate() {
        return this._data && this._data.length > 0;
    }

    _prepare() {
        this._fixedHeight = this._cellHeightA * this._fixedRows + this._cellHeightA;

        const w = this._sumWidth();
        const h = this._data.length * this._cellHeightA;

        if (w + this._sliderWidth < this._width) {
            this._width = w + this._sliderWidth;
            this._scrollbar.visible[0] = false;
        }

        if (h + this._sliderWidth + this._cellHeightA < this._height) {
            this._height = h + this._sliderWidth + this._cellHeightA;
            this._scrollbar.visible[1] = false;
        }

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
        if (this._data.length > 0 && this._data[0].length > 0) {
            this._dataIsArray = Array.isArray(this._data[0]);
        }

        if (!this._columns) {
            // CSV or JSON
            const keys = this._data.columns ? this._data.columns : Object.keys(this._data[0]);
            let x = 0;
            this._columns = keys.map((c, i) => {
                const isNumber = typeof this._data[0][c] === "number";
                const column = {
                    name: c,
                    isNumber: isNumber,
                    format: isNumber ? this._defaultNumberFormat : null,
                    order: 0, // 0: none, 1: ascending, 2: descending
                    x: x,
                    tx: x, // x for translate
                    index: i,
                    width: this._defaultColumnWidth
                }
                x += column.width;
                return column;
            });
        }
        else {
            let x = 0;
            this._columns.forEach((column, i) => {
                column.width = column.width || this._defaultColumnWidth;
                column.x = x;
                column.tx = x; // x for translate
                column.index = i;
                x += column.width;
            });
        }

        if (this._autoSizeCell) this._calcSize();

        this._fixedWidth = this._sumWidth(this._fixedColumns);
        for (let i = this._fixedColumns; i < this._columns.length; i++) {
            const c = this._columns[i];
            c.tx = c.x - this._fixedWidth; // x for translate
        }

        this._columns.resetOrder = (except) => this._columns.forEach(c => { if (except && c !== except || !except) c.order = 0; });
    }

    _calcSize() {
        const charBox = this._getBBox("Z");
        // test if it is used in a generator
        if (charBox.width > 0 && charBox.height > 0) {

            // overrides cellHeight
            this._cellHeight = charBox.height;
            this._cellHeightA = charBox.height + this._cellPaddingV * 2;

            // prepare keys
            const keys = [];
            const longest = this._columns.map((column, i) => {
                if (this._dataIsArray) keys.push(i);
                else keys.push(column.name);
                return column.name;
            });

            // find the longest string for each column
            for (let i = 0; i < this._data.length; i++) {
                const row = this._data[i];
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j], column = this._columns[j];
                    const curr = column.isNumber && column.format ? d3.format(column.format)(row[key]) : row[key];
                    if (curr.length > longest[j].length) longest[j] = curr;
                }
            }

            // re-calculate column width for each column based on longest[]
            var x = 0;
            for (let i = 0; i < longest.length; i++) {
                const column = this._columns[i];
                column.x = column.tx = x;
                column.width = this._getBBox(longest[i]).width + this._cellPaddingH * 2 + 20;
                x += column.width;
            }
        }
    }

    _getBBox(str) {
        var t;
        try {
            t = this._svg.append("text").text(str);
            return t.node().getBBox();
        }
        finally {
            t.remove();
        }
    }

    _processHeatmap() {
        if (!this._heatmapPalette) return;

        const all = this._data.slice(this._fixedRows).flatMap(d => {
            const r = this._dataIsArray ?
                d.slice(this._fixedColumns) :
                Object.keys(d).map(k => d[k]).slice(this._fixedColumns);

            const values = [];
            for (let i = 0; i < r.length; i++) {
                const col = this._columns[i + this._fixedColumns];
                if (col.isNumber) values.push(this._dataIsArray ? r[i] : r[col.name]);
            }
            return r;
        })

        const ext = d3.extent(all);
        const p = this._heatmapPalette;
        if (Array.isArray(p)) {
            // Palette is an array
            this._heatmapColor = d3.scaleSequential()
                .domain(this._series(ext[0], ext[1], p.length))
                .range(p);
        }
        else if (typeof p === "function") {
            // Palette is a color interpolator
            this._heatmapColor = d3.scaleSequential(p)
                .domain(ext);
        }
    }

    _series(min, max, num) {
        const n = num - 1, s = [min], intrv = max / n;
        var i = min;
        while (i < max && s.length < num) {
            i += intrv;
            s.push(i);
        }

        if (s.length < num)
            s.push(max);
        else
            s[s.length - 1] = max;

        return s;
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
            addClipPath("headerClip" + i, column.width - this._cellPaddingH, this._cellHeightA);
            if (column.isNumber)
                addClipPath("cellClip" + i, column.width - this._cellPaddingH, this._cellHeightA, -(column.width - this._cellPaddingH));
            else
                addClipPath("cellClip" + i, column.width - this._cellPaddingH, this._cellHeightA);
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
        //if (this._dataIsArray) rows.forEach(r => r[0].origin = r);
        // moveable part of the body, x is controlled by horizontal scrollbar
        const cell = this._addRows(
            dataArea,
            "row",
            () => rows,
            (d, i) => this._columns.slice(this._fixedColumns).map((c, j) => {
                return {
                    rowIndex: i + this._fixedRows,
                    column: c,
                    value: this._dataIsArray ? d[c.index] : d[c.name]
                }
            }),
            (d, i) => `translate(0,${i * this._cellHeightA})`,
            d => `translate(${d.column.tx},0)`,
            g => this._addCell(g, style.background, this._fixedColumns))
            .on("click", click)
            .on("contextmenu", contextmenu)
            .on("mouseover", mouseover)
            .on("mouseleave", mouseleave);

        var fixedCell;
        if (this._fixedColumns) {
            // fixed columns on the left
            fixedCell = this._addRows(
                body.append("g"),
                "row",
                () => rows.map((r, i) => this._columns.slice(0, this._fixedColumns).map((c, j) => ({
                    origin: r, // for sort to get the index of data
                    rowIndex: i + this._fixedRows,
                    column: c,
                    value: this._dataIsArray ? r[c.index] : r[c.name]
                }))),
                d => d,
                (d, i) => `translate(0,${i * this._cellHeightA})`,
                d => `translate(${d.column.tx},0)`,
                g => this._addCell(g, style.fixedBackground, 0, false, true));
        }

        this._body = body;
        this._dataArea = dataArea;

        const test = cross ?
            (d, cell) => cell.rowIndex === d.rowIndex || cell.column.index === d.column.index :
            (d, cell) => cell.rowIndex === d.rowIndex && cell.column.index === d.column.index;

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

            if (that._onclick) that._onclick(e, d);
        }

        function contextmenu(e, d) {
            if (that._oncontextmenu) {
                if (that._focus !== d) {
                    that._focus = null;
                    mouseover(e, d);
                    that._focus = d;
                    that._oncontextmenu(e, d);
                }
                return false;
            }
        }

        function mouseover(e, d) {
            if (!highlight || that._focus) return;

            const r = cell.select("rect")
                .datum(cell => test(d, cell) ? style.highlightBackground : that._cellColor(cell, style.background, false, false))
                .attr("fill", d => d);
            if (!that._style.border) r.attr("stroke", d => d);

            if (fixedCell) fixedCell.select("text").attr("font-weight", cell => cell.rowIndex === d.rowIndex ? "bold" : "");
            that._dataHeader.selectAll("text").attr("font-weight", cell => cell.column.index === d.column.index ? "bold" : "");

            if (that._onhighlight) {
                that._onhighlight(e, {
                    cell: d,
                    column: d.column,
                    getRow: () => that.getRowData(d.rowIndex),
                    getColumn: () => that.getColumnData(d.column.index)
                });
            }
        }

        function mouseleave() {
            if (!highlight || that._focus) return;

            const r = cell.select("rect").attr("fill", d => that._cellColor(d, style.background, false, false));
            if (!that._style.border) r.attr("stroke", d => that._cellColor(d, style.background, false, false));

            if (fixedCell) fixedCell.select("text").attr("font-weight", "");
            that._dataHeader.selectAll("text").attr("font-weight", "");
        }
    }

    _updateHeatmap() {
        const bg = this._style.background;
        const rects = this._dataArea.selectAll("rect");
        if (this._heatmap) {
            rects.attr("fill", d => this._cellColor(d, bg, false, false));
            if (!this._style.border) rects.attr("stroke", d => this._cellColor(d, bg, false, false));
        }
        else {
            rects.attr("fill", d => bg);
            if (!this._style.border) rects.attr("stroke", bg);
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
            // Unify the the data structure make it compatible with addCell
            .data(this._columns.slice(0, this._fixedColumns).map((d, i) => ({
                column: d
            })))
            .join("g")
            .attr("class", "column")
            .attr("transform", d => `translate(${d.column.tx},0)`)
            .call(g => this._addCell(g, style.headerBackground, 0, true, true))
            .on("click", (e, d) => this._sort(d));

        // fixed data cells in the fixed columns section
        if (this._fixedColumns) {
            this._addRows(
                header,
                "fixedRow",
                () => rows.map((r, i) => this._columns.slice(0, this._fixedColumns).map((c, j) => ({
                    rowIndex: i,
                    column: c,
                    value: this._dataIsArray ? r[c.index] : r[c.name]
                }))),
                d => d,
                (d, i) => `translate(0,${(i + 1) * this._cellHeightA})`,
                d => `translate(${d.column.tx},0)`,
                g => this._addCell(g, style.fixedBackground, 0, false, true));
        }

        // the container of the rest of the header cells, its content is clipped by headerClip
        const headerBox = header.append("g")
            .attr("clip-path", this._clipPath("headerRowClip"))
            .attr("transform", `translate(${this._fixedWidth},0)`);

        // horizontally moveable part of the header, x is controlled by and synchronized with horizontal scrollbar
        const dataHeader = headerBox.append("g");
        dataHeader.selectAll(".column")
            // Unify the the data structure make it compatible with addCell
            .data(this._columns.slice(this._fixedColumns).map((d, i) => ({
                column: d
            })))
            .join("g")
            .attr("class", "column")
            .attr("transform", d => `translate(${d.column.tx},0)`)
            .call(g => this._addCell(g, style.headerBackground, this._fixedColumns, true, true))
            .on("click", (e, d) => this._sort(d));

        this._addRows(
            dataHeader,
            "fixedRow",
            () => rows,
            (d, i) => this._columns.slice(this._fixedColumns).map((c, j) => {
                return {
                    rowIndex: i,
                    column: c,
                    value: this._dataIsArray ? d[c.index] : d[c.name]
                }
            }),
            (d, i) => `translate(0,${(i + 1) * this._cellHeightA})`,
            d => `translate(${d.column.tx},0)`,
            g => this._addCell(g, style.fixedBackground, this._fixedColumns, false, true)
        );

        // a fixed line for seperating header and body
        g.append("line")
            .attr("stroke", style.borderColor)
            .attr("x1", 0)
            .attr("y1", this._cellHeightA)
            .attr("x2", this._width)
            .attr("y2", this._cellHeightA);

        this._header = header;
        this._dataHeader = dataHeader;
    }

    _sort(d) {
        const sorted = this._sortData(d.column);
        const f = 250 / sorted.length;
        this._table.selectAll(".row")
            .transition()
            .duration((d, i) => i * f)
            .ease(d3.easeBounce)
            .attr("transform", d => {
                const i = Array.isArray(d) && d[0].origin !== undefined ? sorted.indexOf(d[0].origin) : sorted.indexOf(d);
                return `translate(0,${i * this._cellHeightA})`;
            });

        const cg = this._header.selectAll(".column");
        cg.select(".asc").attr("fill", _ => d.column === _.column && d.column.order === 1 ? "#777" : "#bbb");
        cg.select(".desc").attr("fill", _ => d.column === _.column && d.column.order === 2 ? "#777" : "#bbb");
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

        const index = this._dataIsArray ? column.index : column.name;

        if (column.isNumber) {
            if (column.order === 0)
                sorted.sort((a, b) => -1);
            else if (column.order === 1)
                sorted.sort((a, b) => a[index] - b[index]);
            else
                sorted.sort((a, b) => b[index] - a[index]);

        }
        else {
            if (column.order === 0)
                sorted.sort((a, b) => -1);
            else if (column.order === 1)
                sorted.sort((a, b) => a[index].localeCompare(b[index]));
            else
                sorted.sort((a, b) => b[index].localeCompare(a[index]));
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
    _addCell(g, fill, base, isHeader, isFixed) {
        const style = this._style;

        const rect = g.append("rect")
            .attr("width", d => d.column.width)
            .attr("height", this._cellHeightA)
            .attr("fill", d => this._cellColor(d, fill, isHeader, isFixed))
            .attr("stroke-width", 0.1)
            .attr("stroke", style.border ? style.borderColor : fill);

        if (this._heatmap && !(isHeader || isFixed)) rect.attr("opacity", 0.5);

        const t = g.append("text").attr("y", "1em").attr("dy", this._cellPaddingV).attr("fill", style.textColor);

        if (isHeader) {
            if (!style.border)
                g.append("line")
                    .attr("x1", d => d.column.width - 1).attr("y1", 5)
                    .attr("x2", d => d.column.width - 1).attr("y2", this._cellHeightA - 5)
                    .attr("stroke", style.borderColor);

            this._arrow(g, base, "asc", "M 0 8 L 3 4 L 6 8");
            this._arrow(g, base, "desc", "M 0 11 L 3 15 L 6 11");

            // Header cell
            t.attr("dx", this._cellPaddingH)
                .attr("clip-path", d => this._clipPath(`headerClip${d.column.index}`))
                .text(d => d.column.name);
        }
        else {
            t.attr("class", "value")
                .attr("dx", d => d.column.isNumber ? -this._cellPaddingH : this._cellPaddingH)
                .attr("clip-path", d => this._clipPath(`cellClip${d.column.index}`))
                .attr("transform", d => `translate(${d.column.isNumber ? d.column.width : 0},0)`)
                .attr("text-anchor", d => d.column.isNumber ? "end" : "start")
                .text(d => {
                    if (d.column.isNumber && d.column.format)
                        return d3.format(d.column.format)(d.value);
                    else
                        return d.value;
                });
        }
    }

    _cellColor(d, fill, isHeader, isFixed) {
        if (this._heatmap) {
            if (isHeader || isFixed || !d.column.isNumber)
                return fill;
            else
                return this._heatmapColor(d.value);
        }
        else
            return fill;
    }

    _arrow(g, base, name, path) {
        g.append("path")
            .attr("class", name)
            .attr("d", path)
            .attr("fill", "#bbb")
            .attr("transform", d => `translate(${d.column.width - this._cellPaddingH - 10},2)`);
    }

    _addScrollbars() {
        if (this._scrollbar.visible[1]) this._addVScroll();
        if (this._scrollbar.visible[0]) this._addHScroll();
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
        const th = (this._data.length - this._fixedRows) * this._cellHeightA,
            sh = this._height - this._fixedHeight;
        this._yf = (th - sh) / (sh - this._sliderLength);

        // Horizontal scrollbar constrain
        const tw = this._sumWidth() - this._sumWidth(this._fixedColumns),
            sw = this._width - this._sumWidth(this._fixedColumns);
        this._xf = (tw - sw) / (sw - this._sliderLength);

        this._minX = -(tw - this._width);
        this._minY = -((this._data.length - this._fixedRows) * this._cellHeightA - this._height);
    }

    _scroll(e) {
        if (this._scrollbar.vertical) {
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
        }

        if (this._scrollbar.horizontal) {
            const dx = e.wheelDeltaX;
            if (dx) {
                const cx = +this._dataArea.attr("transform").split(",")[0].substring(10);
                var x = cx + dx;
                if (x > this._fixedWidth)
                    x = this._fixedWidth;
                else if (x < this._minX)
                    x = this._minX;

                this._dataArea.attr("transform", `translate(${x},0)`);
                this._dataHeader.attr("transform", `translate(${x - this._fixedWidth},0)`);
                this._scrollbar.horizontal.moveSlider(-((x - this._fixedWidth) / this._xf));
            }
        }
        e.preventDefault();
    }
}