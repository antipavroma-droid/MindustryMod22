(function(){
var ModEngineUI = require("ui/mod-engine-ui");
var ModEngineRuntime = require("mod-engine-runtime");

ModEngineRuntime.bindHandlers(ModEngineUI);
ModEngineRuntime.installLifecycle(ModEngineUI);
})