Global = this;

function Namespace(name, f) {
	var n = name.split(".");
	for (var o = Global, i = 0, l = n.length; i < l; i++) {
		o = o[n[i]] = o[n[i]] || {};
	}
	
	if (f) f();
}