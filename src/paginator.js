// https://github.com/analyzer2004/svgtable
// Copyright 2020 Eric Lo
class Paginator {
    constructor(table) {
        this._table = table;
        this._tableWidth = 0;
        this._tableHeight = 0;

        this._top = 0;
        this._left = 0;
        this._pw = 0;
        this._sw = 0;

        this._controls = {
            gotoInput: false,
            recordsPerPageSelector: true
        };
        this._options = {
            position: "top",
            selector: "left",
            buttonColor: "#aaa"
        }
        this._recordsPerPageSelections = [25, 50, 75];

        this._recordCount = 0;
        this._recordsPerPage = 50;
        this._currentPage = 1;
        this._totalPages = 0;
        this._currFloor = 0;
        this._currCeiling = 0;

        this._buttonPadding = 15;
        this._buttonSpacing = 5;
        this._containerTable = null;
        this._selectorCell = null;
        this._paginatorCell = null;

        this._onPageNumberChange = null;
        this._onRecordsPerPageChange = null;
    }

    controls(_) {
        return arguments.length ? (this._controls = _, this) : this._controls;
    }

    options(_) {
        return arguments.length ? (this._options = _, this) : this._options;
    }

    position(_) {
        return arguments.length ? (this._left = _[0], this._top = _[1], this) : [this._left, this.top];
    }

    buttonPadding(_) {
        return arguments.length ? (this._buttonPadding = _, this) : this._buttonPadding;
    }

    buttonSpacing(_) {
        return arguments.length ? (this._buttonSpacing = _, this) : this._buttonSpacing;
    }

    recordsPerPageSelections(_) {
        return arguments.length ? (this._recordsPerPageSelections = _, this) : this._recordsPerPageSelections;
    }

    recordsPerPage(_) {
        if (arguments.length) {
            this._recordsPerPage = _;
            this._totalPages = Math.ceil(this._recordCount / this._recordsPerPage);
            this._validateCurrentPage();
            return this;
        }
        else
            return this._recordsPerPage;
    }

    recordCount(_) {
        if (arguments.length) {
            this._recordCount = _;
            this._totalPages = Math.ceil(this._recordCount / this._recordsPerPage);
            this._validateCurrentPage();
            return this;
        }
        else
            return this._recordCount;
    }

    onPageNumberChange(_) {
        return arguments.length ? (this._onPageNumberChange = _, this) : this._onPageNumberChange;
    }

    onRecordsPerPageChange(_) {
        return arguments.length ? (this._onRecordsPerPageChange = _, this) : this._onRecordsPerPageChange;
    }

    init(recordsPerPage, recordCount) {
        this._recordsPerPage = recordsPerPage;
        this._recordCount = recordCount;
        this._totalPages = Math.ceil(this._recordCount / this._recordsPerPage);
        this._resetBoundary();
        return this;
    }

    render() {
        this._prepare();
        this._createContainers();
        this._renderPaginator();
        if (this._controls.recordsPerPageSelector) {
            this._renderRecordsPerPageSelector();
        }

        this._table.g.append(() => this._containerTable.node());
        return this;
    }

    _prepare() {
        const s = this._table.size();
        this._tableWidth = s[0];
        this._tableHeight = s[1];
    }

    _createContainers() {
        const c = d3.create("svg:g");
        if (this._options.position === "top")
            c.attr("transform", `translate(${this._left},${this._top})`);
        else
            c.attr("transform", `translate(${this._left},${this._top})`);

        this._containerTable = c;
        this._createSelectorCell();
        this._createPaginatorCell();
    }

    _createSelectorCell() {
        if (this._selectorCell) this._selectorCell.remove();
        this._selectorCell = this._containerTable.append("g");
    }

    _createPaginatorCell() {
        if (this._paginatorCell) this._paginatorCell.remove();
        this._paginatorCell = this._containerTable.append("g");
    }

    _renderPaginator(pnum) {
        this._createPaginatorCell();

        //if (this._controls.gotoInput) this._addGotoInput(pnum);
        var tx = 0;
        tx += this._addPageButton(1, tx);
        if (this._currFloor === 1 && this._currentPage < 5) {
            for (let i = 2; i <= this._currCeiling; i++)
                tx += this._addPageButton(i, tx);
        }
        else {
            var floor;
            if (this._totalPages === 5) {
                floor = 2;
            }
            else {
                floor = this._currFloor;
                tx += this._addSeperator(tx);
            }

            for (let i = floor; i <= this._currCeiling; i++) {
                tx += this._addPageButton(i, tx);
            }
        }

        if (this._currCeiling < this._totalPages) {
            tx += this._addSeperator(tx);
            tx += this._addPageButton(this._totalPages, tx);
        }

        this._pw = tx;
        this._adjust();
    }

    _renderRecordsPerPageSelector() {
        this._createSelectorCell();
        var tx = 0;
        this._recordsPerPageSelections.forEach(d => {
            tx += this._addSelectorButton(d, tx);
        });
        this._sw = tx;
        this._selectorCell.attr("transform", `translate(${this._tableWidth - tx},0)`);
    }

    _adjust() {
        const left = this._selectorCell && this._pw > this._tableWidth - this._sw ? this._pw + 30 : this._tableWidth - this._sw;
        this._selectorCell.attr("transform", `translate(${left},0)`);
    }

    _addSelectorButton(num, tx) {
        tx += this._buttonSpacing;
        const s = num.toString();
        const b = this._getBBox(s);
        this._selectorCell.append(() =>
            this._addButton(s, "selBtn", true, b.width, b.height, tx, num === this._recordsPerPage)
                .attr("num", num)
                .on("click", e => this._clickSelectorNumber(e))
                .node()
        );
        return b.width + this._buttonPadding + this._buttonSpacing;
    }

    _addPageButton(pageNum, tx) {
        tx += this._buttonSpacing;
        const s = pageNum.toString();
        const b = this._getBBox(s);
        this._paginatorCell.append(() =>
            this._addButton(s, "pageBtn", true, b.width, b.height, tx, pageNum === this._currentPage)
                .attr("pageNum", pageNum)
                .on("click", e => this._clickPageNumber(e))
                .node()
        );
        return b.width + this._buttonPadding + this._buttonSpacing;
    }

    _addSeperator(tx) {
        tx += this._buttonSpacing;
        const s = "...";
        const b = this._getBBox(s);
        this._paginatorCell.append(() => this._addButton(s, "seperator", false, b.width, b.height, tx).node());
        return b.width + this._buttonPadding + this._buttonSpacing;
    }

    _addButton(caption, className, rect, w, h, tx, selected) {
        const rw = w + this._buttonPadding,
            rh = h + this._buttonPadding / 2;

        return d3.create("svg:g")
            .attr("class", className)
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${tx},0)`)
            .call(g => {
                if (rect)
                    g.append("rect")
                        .attr("rx", 4).attr("ry", 4)
                        .attr("width", rw).attr("height", rh)
                        .attr("opacity", selected ? 1 : 0)
                        .attr("fill", this._options.buttonColor)
            })
            .call(g => g.append("text")
                .attr("transform", `translate(${rw / 2},${rh / 2 + h / 4})`)
                .text(caption));
    }

    _getBBox(str) {
        const svg = this._table.svg;
        if (!svg) return { width: 0, height: 0 };
        else {
            var t;
            try {
                t = svg.append("text").text(str);
                return t.node().getBBox();
            }
            finally {
                t.remove();
            }
        }
    }

    _gotoPage(pnum) {
        if (pnum < 1)
            pnum = 1;
        else if (pnum > this._totalPages)
            pnum = this._totalPages;

        if (pnum <= this._totalPages) {
            if (pnum >= 1 && pnum <= 4) {
                this._currFloor = 1;
                if (this._totalPages <= 5)
                    this._currCeiling = this._totalPages;
                else
                    this._currCeiling = 5;
            }
            else if (pnum >= this._totalPages - 4 && pnum <= this._totalPages) {
                this._currFloor = this._totalPages - 4;
                this._currCeiling = this._totalPages;
            }
            else {
                this._currFloor = pnum - 2;
                this._currCeiling = pnum + 1;
            }
        }
        this._currentPage = pnum;
        return this._currentPage;
    }

    _clickPageNumber(e) {
        var btn = e.currentTarget;
        var pnum = +btn.attributes["pageNum"].value;

        this._currentPage = pnum;
        if (pnum == this._currCeiling && pnum != this._totalPages) {
            this._currCeiling++;
            if (this._currCeiling + 2 >= this._totalPages) {
                this._currCeiling = this._totalPages;
                this._currFloor = this._totalPages - 4;
            }
            else
                this._currFloor = this._currCeiling - 3;
            this._renderPaginator();
        }
        else if (pnum == this._currFloor) {
            this._currFloor--;
            if (this._currFloor < 3)
                this._resetBoundary();
            else
                this._currCeiling = this._currFloor + 3;
            this._renderPaginator();
        }
        else if (pnum == 1) {
            this._resetBoundary();
            this._renderPaginator();
        }
        else if (pnum == this._totalPages && this._totalPages > 5) {
            this._currCeiling = this._totalPages;
            this._currFloor = this._totalPages - 4;
            this._renderPaginator();
        }
        else {
            this._paginatorCell
                .selectAll("rect")
                .nodes().forEach(node => {
                    const num = +node.parentElement.attributes["pageNum"].value;
                    node.setAttribute("opacity", num === this._currentPage ? 1 : 0);
                });
        }

        if (this._onPageNumberChange) {
            var r = this._getRange(pnum);
            this._onPageNumberChange(pnum, r.begin, r.end);
        }
    }

    _clickSelectorNumber(e) {
        var btn = e.currentTarget;
        var num = +btn.attributes["num"].value;

        this.recordsPerPage(num);
        this._selectorCell
            .selectAll("rect")
            .nodes().forEach(node => {
                const n = +node.parentElement.attributes["num"].value;
                node.setAttribute("opacity", num === n ? 1 : 0);
            });

        this._gotoPage(this._currentPage);

        this._renderPaginator();

        if (this._onRecordsPerPageChange) {
            var r = this._getRange(this._currentPage);
            this._onRecordsPerPageChange(this._recordsPerPage, this._currentPage, r.begin, r.end);
        }
    }

    _getRange(pnum) {
        var begin = (pnum - 1) * this._recordsPerPage;
        var end = begin + this._recordsPerPage - 1;
        return { begin: begin, end: end };
    }

    _validateCurrentPage() {
        if (this._currentPage > this._totalPages) {
            this._currentPage = this._totalPages;
            this._currCeiling = this._totalPages;
            this._currFloor = this._totalPages - 4;
        }
    }

    _resetBoundary() {
        this._currFloor = 1;
        this._currCeiling = this._totalPages <= 5 ? this._totalPages : 5;
    }
}