/*
 * NEXUS Slider Test - main entry (auto-loaded by Mindustry as scripts/main.js).
 *
 * Adds a "Waves" button to the main menu that opens a NEXUS_OS-styled dialog
 * containing a custom, good-looking, fully working yellow slider.
 * The slider controls a demo "CURRENT_WAVE" value from 0 to 100.
 *
 * NOTE: BaseDialog, Icon, Styles, Table, Cons, Element, etc. are ALREADY
 * global (Mindustry's global.js does importPackage on all these). We must NOT
 * re-declare them with const/var, or Rhino throws "redeclaration of var".
 *
 * Also: Table.table(function) is AMBIGUOUS in Rhino because there are two
 * overloads table(Cons) and table(Drawable). We wrap builder functions with
 * the global cons() helper so the correct overload is chosen.
 */

const slider = require("slider");

// demo state: "current wave"
var currentWave = 12;

function buildDialog(){
    const dialog = new BaseDialog("");

    // clear default content, build our own NEXUS-style card
    dialog.cont.clear();

    // Styles.black6 is a Drawable -> table(Drawable) overload, no ambiguity.
    const panel = dialog.cont.table(Styles.black6).width(560).get();

    // table(cons(...)) -> table(Cons) overload explicitly.
    const inner = panel.table(cons(function(inr){
        buildInner(inr);
    })).grow().pad(22).get();

    dialog.buttons.button("$back", Icon.left, run(function(){
        dialog.hide();
    })).size(210, 64);

    dialog.addCloseListener();
    return dialog;
}

function buildInner(inner){
    // ---------- header ----------
    inner.table(cons(function(head){
        head.left();
        head.add("[#f4b842]WAVES[]").left();
        head.add().growX();
        head.add("[#8b8f99]LIVE_LINK: OK[]").right();
    })).growX().padBottom(4).row();

    inner.add("[#8b8f99]MANUAL OVERRIDE OF WAVE STATE[]").left().growX().padBottom(24).row();

    // keep the live value label reference in a plain JS variable
    var valLabel = null;

    // ---------- slider header row: label + live value ----------
    inner.table(cons(function(top){
        top.left();
        top.add("[#f4b842]CURRENT_WAVE[]").left();
        top.add().growX();
        valLabel = top.add("[#ffd166]" + Math.round(currentWave) + "[]").right().get();
    })).growX().padBottom(10).row();

    // ---------- the custom slider ----------
    const s = slider.createNexusSlider(0, 100, 1, currentWave, function(v){
        currentWave = v;
        if(valLabel != null){
            valLabel.setText("[#ffd166]" + Math.round(v) + "[]");
        }
    });

    inner.add(s.element).growX().height(30).padBottom(6).row();

    // ---------- scale ticks (0 / 50 / 100) ----------
    inner.table(cons(function(sc){
        sc.add("[#8b8f99]0[]").left();
        sc.add("[#8b8f99]50[]").center().growX();
        sc.add("[#8b8f99]100[]").right();
    })).growX().padBottom(26).row();

    // ---------- quick preset buttons ----------
    inner.table(cons(function(btns){
        const presets = [0, 10, 25, 50, 100];
        presets.forEach(function(p){
            btns.button("" + p, Styles.grayt, run(function(){
                s.setValue(p);
            })).width(84).height(38).pad(4);
        });
    })).growX().padBottom(4).row();
}

// Add the menu button once the client UI is fully loaded.
Events.on(ClientLoadEvent, function(){
    try{
        Vars.ui.menufrag.addButton("Waves", Icon.menu, run(function(){
            buildDialog().show();
        }));
    }catch(e){
        // fallback: overload without an icon
        try{
            Vars.ui.menufrag.addButton("Waves", run(function(){
                buildDialog().show();
            }));
        }catch(e2){
            Log.err("NexusSlider: failed to add menu button: " + e2);
        }
    }
});