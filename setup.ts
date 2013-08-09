
<INCLUDE_TYPOSCRIPT: source="FILE:EXT:theme_mytheme/Resources/Private/TypoScript/_main.ts">

# Sample setup.txt file for the production context template (Configuration/TypoScript/Production in a modernpackage)
# Simply removes all the included assets and only load the built ones

page {
	includeCSS >
	includeCSS.file1 = EXT:theme_mytheme/Resources/Public/Production/all.css
}

page {
	includeJSFooter >
	includeJSFooter.file1 = EXT:theme_mytheme/Resources/Public/Production/all.js
}
