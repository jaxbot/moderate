var config = require("../moderate");

if (process.argv[2] == "devel")
	config.base = config.baseDevel;

var marked = require("marked");
var YAML = require("yamljs");
var fs = require("fs");

var indexfile = fs.readFileSync("template/index.html").toString();
var postfile = fs.readFileSync("template/post.html").toString();

var sitemapdata = "";
var rssdata = "";

fs.readdir('input/', function(err, files){
	for (var i=0; i < files.length; i++) {
		var filename = files[i].substring(0, files[i].length - 3);
		var insides = fs.readFileSync('input/' + files[i]).toString();

		var scope = Object.create(config);

		scope.insides = marked(insides.replace(/---([\s\S]+)---/g, ""));

		if (filename !== "index") {
			var frontMatter = YAML.parse(/---([\s\S]+)---/g.exec(insides)[1]);
			scope.title = frontMatter.title;
			scope.description = frontMatter.description || scope.description;
			scope.date = frontMatter.date;
			scope.img = frontMatter.img || "";

			if (scope.img)
				scope.img = config.base + scope.img;

			scope.contents = varFill(postfile, scope);
		} else {
			scope.contents = scope.insides;
		}

		scope.contents = varFill(indexfile, scope);

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

function varFill(input, scope) {
	return input.replace(/\{\{(\w+)\}\}/g, function (expr, variable) {
		return scope[variable];
	});
}

