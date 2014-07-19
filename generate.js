var config = require("../moderate");

if (process.argv[2] == "devel")
	config.base = config.baseDevel;

var marked = require("marked");
var YAML = require("yamljs");
var fs = require("fs");

var indexfile = fs.readFileSync("template/index.html").toString();
var postfile = fs.readFileSync("template/post.html").toString();
var inlinepostfile = fs.readFileSync("template/inlinepost.html").toString();

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

			if (scope.img)
				scope.img = config.base + scope.img;

			scope.contents = varFill(postfile, scope);

			index.push(scope);
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

	index = index.sort(function (a, b) {
		return Date.parse(b.date) - Date.parse(a.date);
	});

	var log = "";
	var scope = Object.create(config);

	console.log(categories);

	for (var i = 0; i < index.length; i++) {
		var date = new Date(Date.parse(index[i].date));
		date = date.getMonth() + "-" + date.getDate() + "-" + (2000 + date.getYear() - 100);

		log += '<li>' + date + ' <a href="articles/' + index[i].filename + '">' + index[i].title + '</a></li>';
	}

	scope.log = "<ul>" + log + "</ul>";
	scope.contents = varFill(fs.readFileSync("template/" + config.index + ".html").toString(), scope);

	fs.writeFileSync("output/log.html", varFill(indexfile, scope));

	var indexpage = "";
	scope = Object.create(config);

	console.log(categories);

	for (var i = 0; i < index.length; i++) {
		if (index[i].featured)
			indexpage += varFill(inlinepostfile, index[i]);
	}

	indexpage = "<div class='posts'>" + indexpage + "</div>";

	fs.writeFileSync("output/index.html", varFill(indexfile, { contents: indexpage, title: config.title }));

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

