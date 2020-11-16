const covid = () => {
    return data = d3.csv("https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv", d => {
        const date = new Date(d.date.replaceAll("-", "/"));
        const y = date.getFullYear(), m = date.getMonth();
        const ldy = new Date(y, m + 1, 0);
        return {
            date: date,
            lastDay: date.getTime() === ldy.getTime(),
            month: (y - 2020) * 12 + m,
            state: d.state,
            fips: +d.fips,
            cases: +d.cases,
            deaths: + d.deaths
        }

        const last = data[data.length - 1].date.getTime();
        for (let i = data.length - 1; i > 0; i--) {
            const row = data[i];
            if (row.date.getTime() === last)
                row.lastDay = true;
            else
                break;
        }
    });
}

const getStates = async (field) => {
    var result;
    await covid().then(data => {
        data.filter(d => d.lastDay)

        const m_month = Math.max.apply(null, data.map(d => d.month));
        const m_fips = Math.max.apply(null, data.map(d => d.fips));

        const states = new Array(m_fips);
        for (let i = 0; i <= m_fips; i++) {
            const row = data.find(d => d.fips === i);
            if (row) states[i] = row.state;
        }

        const matrix = new Array(m_fips + 1).fill(null);
        for (let i = 0; i <= m_fips; i++) {
            matrix[i] = new Array(m_month + 1);
        }

        data.forEach(d => matrix[d.fips][d.month] = {
            cases: d.cases,
            deaths: d.deaths,
            newcases: d.cases,
            newdeaths: d.deaths
        });

        result = matrix.map((d, i) => {
            const row = new Object();
            row.state = states[i];
            for (let m = 0; m < d.length; m++) {
                const mdata = d[m];
                if (mdata && m > 0) {
                    const prev = d[m - 1];
                    if (prev) {
                        mdata.newcases = mdata.cases - prev.cases;
                        mdata.newdeaths = mdata.deaths - prev.deaths;
                    }
                }
                const ycode = 20 + Math.floor(m / 12);
                const mcode = m - Math.floor(m / 12) * 12 + 1;
                row[`${ycode}-${String(mcode).padStart(2, "0")}`] = mdata ? mdata[field] : 0;
            }
            return row;
        }).filter(d => d.state);

        const total = { state: "Total" };
        result.columns = Object.keys(result[0]);
        const months = result.columns.slice(1);

        for (let month of months) {
            let sum = 0;
            for (let row of result) sum += row[month];
            total[month] = sum;
        }
        result.unshift(total)
    });

    return result;
}