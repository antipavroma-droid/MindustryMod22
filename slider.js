/*
 * NEXUS-style custom slider for Mindustry V8.
 *
 * NOTE: Mindustry's global.js already imports arc packages
 * (importPackage(Packages.arc.math), .graphics, .graphics.g2d, .scene,
 *  .scene.event, ...). So Mathf, Draw, Fill, Color, Element, InputListener,
 * Cons, etc. are ALREADY global. Re-declaring them with const/var causes
 * "redeclaration of var" errors. We therefore use them directly.
 *
 * A stylized, modern replacement for the vanilla Mindustry slider:
 *   - dark rounded track
 *   - bright yellow filled portion
 *   - a thin glowing yellow vertical "handle" bar (like the reference image)
 *   - fully working: click + drag on desktop, tap + drag on mobile
 *
 * Usage:
 *   const s = createNexusSlider(min, max, step, startValue, function(val){ ... });
 *   table.add(s.element).growX().height(30);
 */

// Palette matching the NEXUS_OS reference screenshot.
const COL_TRACK_BG = Color.valueOf("2a2d33");   // dark grey track
const COL_TRACK_HL = Color.valueOf("3a3e46");   // lighter grey edge
const COL_FILL     = Color.valueOf("f4b842");   // warm yellow fill
const COL_HANDLE   = Color.valueOf("ffd166");   // bright yellow handle
const COL_GLOW     = Color.valueOf("f4b842");   // glow around handle

function createNexusSlider(min, max, step, startValue, onChange){
    // shared state between draw() and the input listener
    const state = {
        min: min,
        max: max,
        step: step,
        value: Mathf.clamp(startValue, min, max),
        dragging: false,
        hover: 0.0
    };

    // ---------- helper: rounded horizontal bar ----------
    function roundedBar(bx, by, bw, bh, r){
        if(bw <= 0) return;
        r = Math.min(r, bh / 2, bw / 2);
        Fill.crect(bx + r, by, bw - 2 * r, bh);      // middle rectangle
        Fill.circle(bx + r, by + bh / 2, r);          // left cap
        Fill.circle(bx + bw - r, by + bh / 2, r);     // right cap
    }

    // Build a custom Element with an overridden draw() using the global extend().
    const slider = extend(Element, {
        draw: function(){
            const x = this.x;
            const y = this.y;
            const w = this.getWidth();
            const h = this.getHeight();

            const trackH = Math.max(6, h * 0.28);
            const trackY = y + (h - trackH) / 2;
            const radius = trackH / 2;

            const frac = (state.value - state.min) / (state.max - state.min);
            const fillW = w * Mathf.clamp(frac, 0, 1);

            // animate glow toward target (pressed/hover)
            let mouse = false;
            try { mouse = this.hasMouse(); } catch(e){ mouse = false; }
            const target = state.dragging ? 1.0 : (mouse ? 0.55 : 0.0);
            state.hover = Mathf.lerpDelta(state.hover, target, 0.2);

            // ---- background track ----
            Draw.color(COL_TRACK_BG, 1);
            roundedBar(x, trackY, w, trackH, radius);

            // subtle top edge highlight
            Draw.color(COL_TRACK_HL, 0.5);
            Fill.crect(x + radius, trackY + trackH - 1.5, w - trackH, 1.5);

            // ---- filled (yellow) portion ----
            if(fillW > 0.5){
                Draw.color(COL_FILL, 1);
                const fw = Math.max(fillW, trackH);
                roundedBar(x, trackY, fw, trackH, radius);
            }

            // ---- handle ----
            const hx = x + Mathf.clamp(fillW, radius, w - radius);
            const handleW = 5;
            const handleH = h * 0.9;
            const handleY = y + (h - handleH) / 2;

            // glow behind handle
            const g = state.hover;
            if(g > 0.01){
                Draw.color(COL_GLOW, 0.35 * g);
                Fill.crect(hx - handleW * 1.9, handleY - handleH * 0.08,
                           handleW * 3.8, handleH * 1.16);
            }

            // bright vertical handle bar
            Draw.color(COL_HANDLE, 1);
            Fill.crect(hx - handleW / 2, handleY, handleW, handleH);

            // crisp darker core line
            Draw.color(COL_FILL, 0.9);
            Fill.crect(hx - 1, handleY + handleH * 0.15, 2, handleH * 0.7);

            Draw.reset();
        }
    });

    // default size (Table cell overrides this via growX()/height())
    slider.setSize(360, 28);

    // ---------- input handling ----------
    function applyFromX(localX){
        const w = slider.getWidth();
        const pad = slider.getHeight() * 0.14;
        let frac = (localX - pad) / (w - 2 * pad);
        frac = Mathf.clamp(frac, 0, 1);
        let raw = state.min + frac * (state.max - state.min);
        if(state.step > 0){
            raw = Math.round(raw / state.step) * state.step;
        }
        const newVal = Mathf.clamp(raw, state.min, state.max);
        state.value = newVal;
        if(onChange) onChange(newVal);
    }

    // InputListener is global (importPackage arc.scene.event).
    // Use the global extend() helper for a robust JavaAdapter subclass.
    slider.addListener(extend(InputListener, {
        touchDown: function(event, mx, my, pointer, button){
            state.dragging = true;
            applyFromX(mx);
            return true;
        },
        touchDragged: function(event, mx, my, pointer){
            applyFromX(mx);
        },
        touchUp: function(event, mx, my, pointer, button){
            state.dragging = false;
        }
    }));

    return {
        element: slider,
        getValue: function(){ return state.value; },
        setValue: function(v){
            state.value = Mathf.clamp(v, state.min, state.max);
            if(onChange) onChange(state.value);
        }
    };
}

module.exports = { createNexusSlider: createNexusSlider };