if (typeof JSDOC == "undefined") JSDOC = {};

/**
	Create a new Symbol.
	@class Represents a symbol in the source code.
 */
JSDOC.Symbol = function() {
	this.init();
	if (arguments.length) this.populate.apply(this, arguments);
}

JSDOC.Symbol.prototype.init = function() {
	this.$args = {};
	this.addOn = "";
	this.alias = "";
	this.augments = [];
	this.author = "";
	this.classDesc = "";
	this.comment = {};
	this.defaultValue = undefined;
	this.deprecated = "";
	this.desc = "";
	this.events = [];
	this.example = "";
	this.exceptions = [];
	this.inherits = [];
	this.inheritsFrom = [];
	this.isa = "OBJECT";
	this.isEvent = false;
	this.isConstant = false;
	this.isIgnored = false;
	this.isInner = false;
	this.isNamespace = false;
	this.isPrivate = false;
	this.isStatic = false;
	this.isVirtual = false;
	this.memberOf = "";
	this.methods = [];
	this._name = "";
	this.parentConstructor = "";
	this._params = [];
	this.properties = [];
	this.requires = [];
	this.returns = [];
	this.see = [];
	this.since = "";
	this.srcFile = {};
	this.type = "";
	this.version = "";
}

JSDOC.Symbol.prototype.serialize = function() {
	var keys = [];
	for (var p in this) {
		keys.push (p);
	}
	keys = keys.sort();
	
	var out = "";
	for (var i in keys) {
		if (typeof this[keys[i]] == "function") continue;
		out += keys[i]+" => "+Dumper.dump(this[keys[i]])+",\n";
	}
	return "\n{\n" + out + "}\n";
}

JSDOC.Symbol.prototype.clone = function() {
	var clone = new JSDOC.Symbol();
	clone.populate.apply(clone, this.$args); // repopulate using the original arguments
	clone.srcFile = this.srcFile; // not the current srcFile, the one when the original was made
	return clone;
}

JSDOC.Symbol.prototype.__defineSetter__("name",
	function(n) { this._name = n.replace(/\.prototype\.?/g, '#'); }
);
JSDOC.Symbol.prototype.__defineGetter__("name",
	function() { return this._name; }
);
JSDOC.Symbol.prototype.__defineSetter__("params", 
	function(v) {
		for (var i = 0, l = v.length; i < l; i++) {
			if (v[i].constructor != JSDOC.DocTag) { // may be a generic object parsed from signature, like {type:..., name:...}
				this._params[i] = new JSDOC.DocTag("param"+((v[i].type)?" {"+v[i].type+"}":"")+" "+v[i].name);
			}
		}
	}
);
JSDOC.Symbol.prototype.__defineGetter__("params",
	function() { return this._params; }
);

JSDOC.Symbol.prototype.populate = function(
		/** String */ name,
		/** Object[] */ params,
		/** String */ isa,
		/** JSDOC.DocComment */ comment
) {
	this.$args = arguments;
	
	this.name = name;
	this.alias = this.name;
	this.params = params;
	this.isa = (isa == "VIRTUAL")? "OBJECT":isa;
	this.comment = comment;
	this.srcFile = JSDOC.Symbol.srcFile;
	
	if (this.is("FILE") && !this.alias) this.alias = this.srcFile;

	this.setTags();
	
	if (typeof JSDOC.PluginManager != "undefined") {
		JSDOC.PluginManager.run("onSymbol", this);
	}
}

JSDOC.Symbol.prototype.setTags = function() {
	// @author
	var authors = this.comment.getTag("author");
	if (authors.length) {
		this.author = authors.map(function($){return $.desc;}).join(", ");
	}
	
	/*~t
		assert("testing JSDOC.Symbol");
		
		requires("../lib/JSDOC/DocComment.js");
		requires("../frame/String.js");
		requires("../lib/JSDOC/DocTag.js");

		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@author Joe Smith*"+"/"));
		assertEqual(sym.author, "Joe Smith", "@author tag, author is found.");
	*/
	
	// @desc
	var descs = this.comment.getTag("desc");
	if (descs.length) {
		this.desc = descs.map(function($){return $.desc;}).join("\n"); // multiple descriptions are concatenated into one
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@desc This is a description.*"+"/"));
		assertEqual(sym.desc, "This is a description.", "@desc tag, description is found.");
	*/
	
	// @overview
	if (this.is("FILE")) {
		if (!this.alias) this.alias = this.srcFile;
		
		var overviews = this.comment.getTag("overview");
		if (overviews.length) {
			this.desc = [this.desc].concat(overviews.map(function($){return $.desc;})).join("\n");
		}
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@overview This is an overview.*"+"/"));
		assertEqual(sym.desc, "\nThis is an overview.", "@overview tag, description is found.");
	*/
	
	// @since
	var sinces = this.comment.getTag("since");
	if (sinces.length) {
		this.since = sinces.map(function($){return $.desc;}).join(", ");
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@since 1.01*"+"/"));
		assertEqual(sym.since, "1.01", "@since tag, description is found.");
	*/
	
	// @constant
	if (this.comment.getTag("constant").length) {
		this.isConstant = true;
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@constant*"+"/"));
		assertEqual(sym.isConstant, true, "@constant tag, isConstant set.");
	*/
	
	// @version
	var versions = this.comment.getTag("version");
	if (versions.length) {
		this.version = versions.map(function($){return $.desc;}).join(", ");
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@version 2.0x*"+"/"));
		assertEqual(sym.version, "2.0x", "@version tag, version is found.");
	*/
	
	// @deprecated
	var deprecateds = this.comment.getTag("deprecated");
	if (deprecateds.length) {
		this.deprecated = deprecateds.map(function($){return $.desc;}).join("\n");
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@deprecated Use other method.*"+"/"));
		assertEqual(sym.deprecated, "Use other method.", "@deprecated tag, desc is found.");
	*/
	
	// @example
	var examples = this.comment.getTag("example");
	if (examples.length) {
		this.example = examples[0];
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@example This\n  is an example.*"+"/"));
		assertEqual(sym.example, "This\n  is an example.", "@deprecated tag, desc is found.");
	*/
	
	// @see
	var sees = this.comment.getTag("see");
	if (sees.length) {
		var thisSee = this.see;
		sees.map(function($){thisSee.push($.desc);});
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FILE", new JSDOC.DocComment("/**@see The other thing.*"+"/"));
		assertEqual(sym.see, "The other thing.", "@see tag, desc is found.");
	*/
	
	// @class
	var classes = this.comment.getTag("class");
	if (classes.length) {
		this.isa = "CONSTRUCTOR";
		this.classDesc = classes[0].desc; // desc can't apply to the constructor as there is none.
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@class This describes the class.*"+"/"));
		assertEqual(sym.isa, "CONSTRUCTOR", "@class tag, makes symbol a constructor.");
		assertEqual(sym.classDesc, "This describes the class.", "@class tag, class description is found.");
	*/
	
	// @namespace
	var namespaces = this.comment.getTag("namespace");
	if (namespaces.length) {
		this.classDesc = namespaces[0].desc+"\n"+this.desc; // desc can't apply to the constructor as there is none.
		this.isa = "CONSTRUCTOR";
		this.isNamespace = true;
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@namespace This describes the namespace.*"+"/"));
		assertEqual(sym.isa, "CONSTRUCTOR", "@namespace tag, makes symbol a constructor.");
		assertEqual(sym.classDesc, "This describes the namespace.\n", "@namespace tag, class description is found.");
	*/
	
	// @param
	var params = this.comment.getTag("param");
	if (params.length) {
		// user-defined params overwrite those with same name defined by the parser
		var thisParams = this.params;
		if (thisParams.length == 0) { // none exist yet, so just bung all these user-defined params straight in
			this.params = params;
		}
		else { // need to overlay these user-defined params on to existing parser-defined params
			for (var i = 0, l = params.length; i < l; i++) {
				if (thisParams[i]) {
					if (params[i].type) thisParams[i].type = params[i].type;
					thisParams[i].name = params[i].name;
					thisParams[i].desc = params[i].desc;
					thisParams[i].isOptional = params[i].isOptional;
					thisParams[i].defaultValue = params[i].defaultValue;
				}
				else thisParams[i] = params[i];
			}
		}
	}
	
	/*~t
		// todo
	*/
	
	// @constructor
	if (this.comment.getTag("constructor").length) {
		this.isa = "CONSTRUCTOR";
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@constructor*"+"/"));
		assertEqual(sym.isa, "CONSTRUCTOR", "@constructor tag, makes symbol a constructor.");
	*/
	
	// @static
	if (this.comment.getTag("static").length) {
		this.isStatic = true;
		if (this.isa == "CONSTRUCTOR") {
			this.isNamespace = true;
		}
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@static\n@constructor*"+"/"));
		assertEqual(sym.isStatic, true, "@static tag, makes isStatic true.");
		assertEqual(sym.isNamespace, true, "@static and @constructor tag, makes isNamespace true.");
	*/
	
	// @inner
	if (this.comment.getTag("inner").length) {
		this.isInner = true;
		this.isStatic = false;
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@inner*"+"/"));
		assertEqual(sym.isStatic, false, "@inner tag, makes isStatic false.");
		assertEqual(sym.isInner, true, "@inner makes isInner true.");
	*/
	
	// @field
	if (this.comment.getTag("field").length) {
		this.isa = "OBJECT";
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "FUNCTION", new JSDOC.DocComment("/**@field*"+"/"));
		assertEqual(sym.isa, "OBJECT", "@field tag, makes symbol an object.");
	*/
	
	// @function
	if (this.comment.getTag("function").length) {
		this.isa = "FUNCTION";
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@function*"+"/"));
		assertEqual(sym.isa, "FUNCTION", "@function tag, makes symbol a function.");
	*/
	
	// @event
	var events = this.comment.getTag("event");
	if (events.length) {
		this.isa = "FUNCTION";
		this.isEvent = true;
	}
	
	/*~t
		var sym = new JSDOC.Symbol("foo", [], "OBJECT", new JSDOC.DocComment("/**@event*"+"/"));
		assertEqual(sym.isa, "FUNCTION", "@event tag, makes symbol a function.");
		assertEqual(sym.isEvent, true, "@event makes isEvent true.");
	*/
	
	// @name
	var names = this.comment.getTag("name");
	if (names.length) {
		this.name = names[0].desc;
	}
	
	/*~t
		// todo
	*/
	
	// @property
	var properties = this.comment.getTag("property");
	if (properties.length) {
		thisProperties = this.properties;
		for (var i = 0; i < properties.length; i++) {
			var property = new JSDOC.Symbol(properties[i].name, [], "OBJECT", new JSDOC.DocComment("/**"+properties[i].desc+"\n@name "+properties[i].name+"\n@memberOf "+this.alias+"#*/"));
			if (properties[i].type) property.type = properties[i].type;
			if (properties[i].defaultValue) property.defaultValue = properties[i].defaultValue;
			this.addProperty(property);
			if (JSDOC.Parser.symbols) JSDOC.Parser.symbols.push(property);
		}
	}
	
	/*~t
		// todo
	*/

	// @return
	var returns = this.comment.getTag("return");
	if (returns.length) { // there can be many return tags in a single doclet
		this.returns = returns;
		this.type = returns.map(function($){return $.type}).join(", ");
	}
	
	/*~t
		// todo
	*/
	
	// @exception
	this.exceptions = this.comment.getTag("throws");
	
	/*~t
		// todo
	*/
	
	// @requires
	var requires = this.comment.getTag("requires");
	if (requires.length) {
		this.requires = requires.map(function($){return $.desc});
	}
	
	/*~t
		// todo
	*/
	
	// @type
	var types = this.comment.getTag("type");
	if (types.length) {
		this.type = types[0].desc; //multiple type tags are ignored
	}
	
	/*~t
		// todo
	*/
	
	// @private
	if (/(^|[.#-])_[^.#-]+$/.test(this.alias) || this.comment.getTag("private").length) {
		this.isPrivate = true;
	}
	
	// @ignore
	if (this.comment.getTag("ignore").length) {
		this.isIgnored = true;
	}
	
	/*~t
		// todo
	*/
	
	// @inherits ... as ...
	var inherits = this.comment.getTag("inherits");
	if (inherits.length) {
		for (var i = 0; i < inherits.length; i++) {
			if (/^\s*([a-z$0-9_.#-]+)(?:\s+as\s+([a-z$0-9_.#]+))?/i.test(inherits[i].desc)) {
				var inAlias = RegExp.$1;
				var inAs = RegExp.$2 || inAlias;

				if (inAlias) inAlias = inAlias.replace(/\.prototype\.?/g, "#");
				
				if (inAs) {
					inAs = inAs.replace(/\.prototype\.?/g, "#");
					inAs = inAs.replace(/^this\.?/, "#");
				}

				if (inAs.indexOf(inAlias) != 0) { //not a full namepath
					var joiner = ".";
					if (this.alias.charAt(this.alias.length-1) == "#" || inAs.charAt(0) == "#") {
						joiner = "";
					}
					inAs = this.alias + joiner + inAs;
				}
			}
			this.inherits.push({alias: inAlias, as: inAs});
		}
	}
	
	/*~t
		// todo
	*/

	// @augments
	this.augments = this.comment.getTag("augments");
	
	// @default
	var defaults = this.comment.getTag("default");
	if (defaults.length) {
		if (this.is("OBJECT")) {
			this.defaultValue = defaults[0].desc;
		}
	}
	
	/*~t
		// todo
	*/
	
	// @memberOf
	var memberOfs = this.comment.getTag("memberOf");
	if (memberOfs.length) {
		this.memberOf = memberOfs[0].desc;
	}
	
	/*~t
		// todo
	*/
	
	// @public
	if (this.comment.getTag("public").length) {
		this.isPrivate = false;
	}
	
	/*~t
		// todo
	*/
}

JSDOC.Symbol.prototype.is = function(what) {
	return this.isa === what;
}

JSDOC.Symbol.prototype.isBuiltin = function() {
	return JSDOC.Lang.isBuiltin(this.alias);
}

JSDOC.Symbol.prototype.setType = function(/**String*/comment, /**Boolean*/overwrite) {
	if (!overwrite && this.type) return;
	var typeComment = JSDOC.DocComment.unwrapComment(comment);
	this.type = typeComment;
}

JSDOC.Symbol.prototype.inherit = function(symbol) {
	if (!this.hasMember(symbol.name) && !symbol.isInner) {
		if (symbol.is("FUNCTION"))
			this.methods.push(symbol);
		else if (symbol.is("OBJECT"))
			this.properties.push(symbol);
	}
}

JSDOC.Symbol.prototype.makeMemberOf = function(alias) {
	alias = alias.replace(/\.prototype(\.|$)/g, "#");
	var thisAlias = this.alias;
	
	var joiner = ".";
	if (alias.charAt(alias.length-1) == "#" || thisAlias.charAt(0) == "#") {
		joiner = "";
	}
	if (thisAlias.match(new RegExp('^('+alias+'[.#-]?)'))) {
		thisAlias = thisAlias.substr(RegExp.$1.length);
		this.name = thisAlias;
	}
	else {
		this.alias = alias + joiner + thisAlias;
	}
	this.memberOf = alias;
}

JSDOC.Symbol.prototype.hasMember = function(name) {
	return (this.hasMethod(name) || this.hasProperty(name));
}

JSDOC.Symbol.prototype.hasMethod = function(name) {
	var thisMethods = this.methods;
	for (var i = 0, l = thisMethods.length; i < l; i++) {
		if (thisMethods[i].name == name) return true;
		if (thisMethods[i].alias == name) return true;
	}
	return false;
}

JSDOC.Symbol.prototype.addMethod = function(symbol) {
	var methodAlias = symbol.alias;
	var thisMethods = this.methods;
	for (var i = 0, l = thisMethods.length; i < l; i++) {
		if (thisMethods[i].alias == methodAlias) {
			thisMethods[i] = symbol; // overwriting previous method
			return;
		}
	}
	thisMethods.push(symbol); // new method with this alias
}

JSDOC.Symbol.prototype.hasProperty = function(name) {
	var thisProperties = this.properties;
	for (var i = 0, l = thisProperties.length; i < l; i++) {
		if (thisProperties[i].name == name) return true;
		if (thisProperties[i].alias == name) return true;
	}
	return false;
}

JSDOC.Symbol.prototype.addProperty = function(symbol) {
	var propertyAlias = symbol.alias;
	var thisProperties = this.properties;
	for (var i = 0, l = thisProperties.length; i < l; i++) {
		if (thisProperties[i].alias == propertyAlias) {
			thisProperties[i] = symbol; // overwriting previous property
			return;
		}
	}

	thisProperties.push(symbol); // new property with this alias
}

JSDOC.Symbol.srcFile = ""; //running reference to the current file being parsed
