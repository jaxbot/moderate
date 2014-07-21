var config = require("../moderate");

if (process.argv[2] == "devel")
	config.base = config.baseDevel;

var marked = require("marked");
var YAML = require("yamljs");
var fs = require("fs");

var sitemapdata = "";
var rssdata = "";

var index = [];
var categories = [];

fs.readdir('input/', function(err, files){
	for (var i=0; i < files.length; i++) {
		var filename = files[i].substring(0, files[i].length - 3);
		var insides = fs.readFileSync('input/' + files[i]).toString();

		var scope = Object.create(config);

		scope.insides = marked(insides.replace(/---([\s\S]+)---/g, ""));

		if (filename !== "index") {
			var frontMatter = YAML.parse(/---([\s\S]+)---/g.exec(insides)[1]);
			scope.file = files[i];
			scope.filename = filename;
			scope.title = frontMatter.title;
			scope.description = frontMatter.description || scope.description;
			scope.date = frontMatter.date;
			scope.featured = frontMatter.featured;
			scope.img = frontMatter.img || scope.img;
			scope.categories = frontMatter.categories || "";

			var c = scope.categories.split(",");
			for (var j = 0; j < c.length; j++) {
				if (c[j] && categories.indexOf(c[j]) == -1) {
					categories.push(c[j]);
				}
			}

			if (scope.img != config.img)
				scope.img = config.base + scope.img;
			else
				scope.img = '';

			scope.contents = T("post")(scope);

			index.push(scope);
		} else {
			scope.contents = scope.insides;
		}

		scope.contents = T("page")(scope);

		fs.writeFileSync('output/' + filename + ".html", scope.contents);

		var img = "";

		if (filename != "index") {
			sitemapdata += "<url>" + 
				"<loc>" + config.base + "articles/" + filename + "</loc>" +
				(img ? "<image:image><image:loc>" + img + "</image:loc></image:image>" : "") +
				"</url>\n";
			rssdata += "<item>" +
				"<link>" + config.base + "articles/" + filename + "</link>" + 
				"<title>" + scope.title + "</title>" +
				"</item>";
		}
	}

	index = index.sort(function (a, b) {
		return Date.parse(b.date) - Date.parse(a.date);
	});

	var log = "";
	var scope = Object.create(config);

	for (var i = 0; i < index.length; i++) {
		var date = new Date(Date.parse(index[i].date));
		date = date.getMonth() + "-" + date.getDate() + "-" + (2000 + date.getYear() - 100);

		log += '<li>' + date + ' <a href="articles/' + index[i].filename + '">' + index[i].title + '</a></li>';
	}

	scope.log = "<ul>" + log + "</ul>";
	scope.contents = T(config.index)(scope);

	fs.writeFileSync("output/log.html", T("page")(scope));

	var indexpage = "";
	var thinposts = [];
	scope = Object.create(config);

	for (var i = 0; i < index.length; i++) {
		index[i].display = index[i].featured ? "inline-block" : "none";
		var thinpost = { title: index[i].title, img: index[i].img, featured: index[i].featured, categories: index[i].categories, filename: index[i].filename };
		if (!thinpost.img) {
			thinpost.description = index[i].description;
		}
		if (index[i].featured)
			indexpage += T("inlinepost")(thinpost);
		thinposts.push(thinpost);
		
	}

	indexpage = "<div class='posts' id='posts'>" + indexpage + "</div>";

	scope.contents = indexpage;
	scope.posts = JSON.stringify(thinposts);
	scope.posttemplate = JSON.stringify(getTemplate("inlinepost"));
	scope.contents = T("index")(scope);

	fs.writeFileSync("output/index.html", T("page")(scope));

	fs.writeFileSync('output/sitemap.xml',
		"<?xml version='1.0' encoding='UTF-8'?>" +
		"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" " +
		"xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">" +
		sitemapdata +
		"</urlset>");

	fs.writeFileSync('output/rss.xml',
		"<?xml version='1.0' encoding='UTF-8'?>" +
		"<rss version=\"2.0\"><channel>" +
		"<title>" + config.title + "</title>" +
		"<description>" + config.description + "</description>" +
		"<link>" + config.base + "</link>" + rssdata +
		"</channel></rss>");

});

/*
 * string -> html = "string"
 * {{ expression }} -> " + expression + "
 * <script>expression</script> -> "; (expression) html += "
 */
function t(data) {
	var obj = "" + data;
	obj = obj.replace(/\"/g, "\\\"");

	obj = obj.replace(/\$/g, "it.");

	obj = obj.replace(/\{{([^\n}]*)\}}/g, function(match,m1) {
		return "\"+" + m1 + "+\"";
	});

	obj = obj.replace(/(\<\%\ if\ )(\((.*)\))(\ \%\>)/g, function(match,m1, m2) {
		return "\"+((" + m2.replace(/\\\"/g, "\"") + ")?(\"";
	});

	obj = obj.replace(/(\<\%\ endif\ \%\>)/g, function(match,m1, m2) {
		return "\"):\"\")+\"";
	});

	obj = obj.replace(/(\<\%\ else\ \%\>)/g, function(match,m1, m2) {
		return "\"):(\"";
	});

	obj = obj.replace(/(\<\%\ endelse\ \%\>)/g, function(match,m1, m2) {
		return "\"))+\"";
	});

	obj = obj.replace(/<\?((.|\n|\r)*?)\?\>/g, function(match) {
		return match.replace(/\\\"/g, "\"");
	});

	obj = obj.replace(/\<\?/g, "\";");
	obj = obj.replace(/\?\>/g, "html+=\"");

	obj = obj.replace(/\n/gm, "");
	obj = obj.replace(/\r/gm, "");
	obj = obj.replace(/\t/gm, "");

	return "var html = \"" + obj + "\";return html;";
}

function getTemplate(template) {
	if (!module.templateCache)
		module.templateCache = {}

	var c;
	if (c = module.templateCache[template])
		return c;
	c = t(fs.readFileSync("template/" + template + ".html"));

	return module.templateCache[template] = c;
}

function T(template) {
	return new Function("it", getTemplate(template));
}

