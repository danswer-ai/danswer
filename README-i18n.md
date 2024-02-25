
This is a version of Danswer with Internationalization (i18n) support.

**i18n patch install instructions**

install the prerequisite i18next & react packages

	npm install i18next react-i18next i18next-resources-to-backend next-i18n-router
OR
	put "npm install" inside the Dockerfile. :)


**Status:**

In this release, only the minimal i18n infrastructure is included.
Only the Welcome popup is translated.
There are 'en' and 'it' locales only.

To verify it:
http://localhost:3000/search	
http://localhost:3000/en/search
http://localhost:3000/it/search


**How to add a new message:**

Have a look at the official i18next doc: 
https://react.i18next.com/latest/usetranslation-hook


**How to add a new language:**

Using the official doc is never a bad idea anyway, but the short answer is:

- Edit the i18nConfig.js file, adding the lowercase, 2-letter ISO-country 
code to the locales [] array.
- Go to locales/ and create a dir with the same 2-letter code
- Copy the english json files in this directory, or better yet, an already llm/gpt translated one.
- Translate the json file into the language corresponding to the 2-letter code.
- Test it, going to your danswer site and inserting the 2-letter code in the url after 
the host and port, like explained before with 'it' and 'en'


