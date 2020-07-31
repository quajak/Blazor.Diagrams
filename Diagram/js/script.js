window.Excubo = window.Excubo || {};
window.Excubo.Diagrams = window.Excubo.Diagrams || {
    // function callable from C# to get the position of an element
    position: (e) => { return { 'Left': e.offsetLeft, 'Top': e.offsetTop } },
    // function callable from C# to get the size of an element
    size: (e) => { return { 'Width': e.clientWidth, 'Height': e.clientHeight } },
    // the ro (resizeObserver) is one instance of a ResizeObserver for any diagram. It is used to identify changes in the size of nodes.
    ro: new ResizeObserver((es) => {
        for (const e of es) {
            let el = Array.from(new Set(e.target.attributes)).find((e) => e.name.startsWith('_bl_')).name;
            let r = window.Excubo.Diagrams.rs[el];
            if (r != undefined) {
                r.Ref.invokeMethodAsync('OnResize', { 'Width': e.contentRect.width, 'Height': e.contentRect.height }).catch(() => { });
            }
        }
    }),
    // the mo (mutationObserver) is one instance of a MutationObserver for any diagram. it is used to identify changes in the position of the diagram canvas.
    mo: new MutationObserver((es) => {
        for (const key in window.Excubo.Diagrams.rs) {
            var r = window.Excubo.Diagrams.rs[key];
            if (r != undefined) {
                const new_left = r.Element.offsetLeft;
                const new_top = r.Element.offsetTop;
                const new_width = r.Element.clientWidth;
                const new_height = r.Element.clientHeight;
                if (r.Left != new_left || r.Top != new_top || r.Width != new_width || r.Height != new_height) {
                    r.Left = new_left;
                    r.Top = new_top;
                    r.Width = new_width;
                    r.Height = new_height;
                    r.Ref.invokeMethodAsync('OnMove', { 'Left': new_left, 'Top': new_top, 'Width': new_width, 'Height': new_height }).catch(() => { });
                }
            }
        }
    }),
    // captured references (rs) to C# objects and DOM elements used in the resize observer.
    rs: {},
    // function callable from C# to start observing resizes. Captures a reference to an element and a C# object.
    observeResizes: (el, id, r) => {
        const d = window.Excubo.Diagrams;
        d.rs[id] = { Element: el, Ref: r, Left: el.offsetLeft, Top: el.offsetTop, Width: el.clientWidth, Height: el.clientHeight };
        d.ro.observe(el)
    },
    // function callable from C# to stop observing resizes. Frees the references.
    unobserveResizes: (el, id) => {
        const d = window.Excubo.Diagrams;
        delete d.rs[id];
        d.ro.unobserve(el)
    },
    // function callable from C# to start observing moves. Captures a reference to all the parents of an element, and a C# object.
    observeMoves: (el, id, r) => {
        const d = window.Excubo.Diagrams;
        d.rs[id] = { Element: el, Ref: r, Left: el.offsetLeft, Top: el.offsetTop, Width: el.clientWidth, Height: el.clientHeight, Parents: [] };
        while (el.parentElement != null) {
            d.rs[id].Parents.push(el.parentElement);
            d.mo.observe(el.parentElement, {attributes: true});
            el = el.parentElement;
        }
    },
    // function callable from C# to stop observing moves. Frees the references.
    unobserveMoves: (el, id) => {
        const d = window.Excubo.Diagrams;
        const parents = d.rs[id].Parents;
        delete d.rs[id];
        const used_elsewhere = (p) => {
            // check whether any other reference holds on to this parent.
            for (const id in d.rs) {
                const r = d.rs[id];
                if (r != undefined && r.Parents != undefined && r.Parents.includes(p)) {
                    return true;
                }
            }
            return false;
        };
        while (true) {
            const parent = parents.pop();
            if (parent == undefined) {
                break;
            }
            if (!used_elsewhere(parent)) {
                d.mo.unobserve(parent);
            }
        }
    }
};