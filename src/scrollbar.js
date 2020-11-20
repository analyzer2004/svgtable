class Scrollbar {
    constructor(svg) {
        this._svg = svg;
        this._g = null;
        this._box = null;
        this._vertical = true;
        this._bar = null;
        this._slider = null;

        this._sliderWidth = 13;
        this._sliderLength = 50;

        this._sliderTimer = null;
        this._sliderTimeout = 300;
        this._sliderSteps = null;

        this._grabbing = false;
        this._delta = 0;
        this._deltac = 0;

        this._onscroll = null;
        this._namespace = `eric.scrollbar.${Date.now() * Math.random()}`;
    }

    vertical(_) {
        return arguments.length ? (this._vertical = _, this) : this._vertical;
    }

    sliderWidth(_) {
        return arguments.length ? (this._sliderWidth = _, this) : this._sliderWidth;
    }

    sliderLength(_) {
        return arguments.length ? (this._sliderLength = _, this) : this._sliderLength;
    }

    position(x, y, length) {
        return arguments.length ? (this._box = { x, y, length }, this) : this._box;
    }

    onscroll(_) {
        return arguments.length ? (this._onscroll = _, this) : this._onscroll;
    }

    attach() {
        this._render();
        this._attachEvents();
    }

    dispose() {
        if (this._g) this._g.remove();
        d3.select("body")
            .on(`mousedown.${this._namespace}`, null)
            .on(`mouseup.${this._namespace}`, null)
            .on(`mousemove.${this._namespace}`, null);
    }

    moveSlider(pos) {
        if (pos < 0)
            pos = 0;
        else if (pos + this._sliderLength > this._box.length)
            pos = this._box.length - this._sliderLength;

        this._slider.attr(this._vertical ? "y" : "x", pos);
    }

    _render() {
        if (this._vertical)
            this._renderVBar();
        else
            this._renderHBar();
    }

    _renderVBar() {
        const box = this._box;

        const g = this._svg.append("g")
            .attr("transform", `translate(${box.x},${box.y})`);

        this._bar = g.append("rect")
            .attr("width", this._sliderWidth)
            .attr("height", box.length)
            .attr("fill", "#eee");

        this._slider = g.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", this._sliderWidth)
            .attr("height", this._sliderLength)
            .attr("fill", "#ccc");

        this._g = g;
    }

    _renderHBar() {
        const box = this._box;

        const g = this._svg.append("g")
            .attr("transform", `translate(${box.x},${box.y})`);

        this._bar = g.append("rect")
            .attr("width", box.length)
            .attr("height", this._sliderWidth)
            .attr("fill", "#eee");

        this._slider = g.append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", this._sliderLength)
            .attr("height", this._sliderWidth)
            .attr("fill", "#ccc");

        this._g = g;
    }

    _attachEvents(tbox) {
        const box = this._box;

        //this._svg
        d3.select("body")
            .on(`mousedown.${this._namespace}`, e => {
                if (e.buttons === 1) {
                    const p = d3.pointer(e);
                    if (e.srcElement === this._slider.node()) {
                        this._grabbing = true;
                        this._slider.attr("fill", "#aaa");
                        if (this._vertical) {
                            this._delta = p[1] - +this._slider.attr("y");
                            this._deltac = p[1] - +this._slider.attr("y") - this._sliderLength / 2;
                        }
                        else {
                            this._delta = p[0] - +this._slider.attr("x");
                            this._deltac = p[0] - +this._slider.attr("x") - this._sliderWidth / 2;
                        }
                        e.stopPropagation();
                    }
                    else if (e.srcElement === this._bar.node()) {
                        const cbox = this._bar.node().getBoundingClientRect();

                        var a, b, pos;
                        if (this._vertical) {
                            a = pos = +this._slider.attr("y");
                            b = p[1] - cbox.y;
                        }
                        else {
                            a = pos = +this._slider.attr("x");
                            b = p[0] - cbox.x;
                        }

                        const intr = (b - a) / 4;
                        const steps = [];
                        for (var i = 0; i < 3; i++) {
                            pos += intr;
                            steps.push(pos);
                        }

                        if (b + this._sliderLength > this._box.length)
                            steps.push(this._box.length - this._sliderLength);
                        else
                            steps.push(b);

                        this._sliderSteps = steps.reverse();
                        this._sliderTimeout = 200;
                        this._sliderTimer = setTimeout(() => this._slide(), this._sliderTimeout);
                        e.stopPropagation();
                    }
                }
            })
            .on(`mouseup.${this._namespace}`, () => {
                if (this._sliderTimer) clearTimeout(this._sliderTimer);
                const steps = this._sliderSteps;
                if (steps && steps.length > 0) {
                    this._slideTo(steps.reverse().pop());
                    this._sliderSteps = null;
                }

                this._grabbing = false;
                this._slider.attr("fill", "#ccc");
            })
            .on(`mousemove.${this._namespace}`, e => {
                const box = this._box;

                if (this._grabbing) {
                    if (this._vertical) {
                        const y = d3.pointer(e)[1];
                        const sy = y - this._delta;
                        if (sy >= 0 && sy <= box.length - this._sliderLength) {
                            this._slider.attr("y", sy);
                            if (this._onscroll) this._onscroll(y, sy, this._deltac);
                        }
                    }
                    else {
                        const x = d3.pointer(e)[0];
                        const sx = x - this._delta;
                        if (sx >= 0 && sx <= box.length - this._sliderLength) {
                            this._slider.attr("x", sx);
                            if (this._onscroll) this._onscroll(x, sx, this._deltac);
                        }
                    }
                }
            });
    }

    _slideTo(dest) {
        this._slider.attr(this._vertical ? "y" : "x", dest);
        if (this._onscroll) this._onscroll(dest, dest, 0);
    }

    _slide() {
        this._slideTo(this._sliderSteps.pop());
        if (this._sliderSteps.length > 0) {
            this._sliderTimeout -= 50;
            this._sliderTimer = setTimeout(() => this._slide(), this._sliderTimeout);
        }
        else
            this._sliderTimer = null;
    }
}