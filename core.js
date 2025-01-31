(function () {
    const SESSION_KEY = 'maniac_session_id';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

    setTimeout(() => {
        document.body.style.opacity = "1";
    }, 500);

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
    }

    function setCookie(name, data, maxAge) {
        const encodedData = encodeURIComponent(JSON.stringify(data));
        // Encode for safety
        document.cookie = `${name}=${encodedData}; max-age=${maxAge}; path=/; secure; samesite=strict`;
    }

    // Wait for the DOM to be minimally ready
    const waitForDom = new Promise(resolve => {
        if (document.body) {
            resolve(); // Body is already available
        } else {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    resolve(); // Body is now available
                }
            });
            observer.observe(document.documentElement, {childList: true});
        }
    });

    const scriptUrl = document.currentScript.src;
    const urlParams = new URLSearchParams(new URL(scriptUrl).search);
    const customerId = parseInt(urlParams.get("customer_id"));
    let sessionId = null;

    if (!customerId) {
        console.log("No customer ID error.");
        Promise.all([waitForDom])
            .then(() => {
                document.body.style.opacity = '1';
            })
        return;
    }

    const getSession = new Promise(resolve => {
        let session = getCookie(SESSION_KEY);
        if (session) {
            console.log("existing session")
            resolve(session);
        } else {
            fetch("https://maniac-functions.vercel.app/api/session", {
                method: "POST",
                body: JSON.stringify({customer_id: customerId})
            }).then(response => response.json())
                .then(r => {
                    //setCookie(SESSION_KEY, r, SESSION_TIMEOUT)
                    resolve(r);
                })
        }
    });

    function changeElementTextByContent(textToFind, newText) {
        // Find all elements in the document
        console.log(textToFind);
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
            // Check if the element's text content matches the textToFind
            // console.log(element.children.length)
            if (element.children.length < 2) {
                console.log(element.textContent.trim(), element.innerHTML.trim());
                if (element.innerHTML.trim() === textToFind) {
                    // Change the text content
                    element.innerHTML = newText;
                    console.log(`Text changed in element:`, element);
                    return; // Stop after the first match
                }
            }
        }
        console.warn(`No element found with the text: "${textToFind}"`);
    }

    function handleExperiment(data) {
        try {
            console.log("Starting subs");
            console.log(data.bandit.source);
            for (let index = 0; index < data.bandit.source.length; ++index) {
                console.log(data.bandit.source[index]);
                console.log(data.arm.subs[index]);
                changeElementTextByContent(data.bandit.source[index].k, data.arm.subs[index].v);
            }
        } catch (err) {
            console.log(err)
        }
    }

    function swapSections(section1, section2) {
        let parent = section1.parentNode;
        let placeholder = document.createElement("div");

        parent.insertBefore(placeholder, section1);
        parent.insertBefore(section1, section2);
        parent.insertBefore(section2, placeholder);

        parent.removeChild(placeholder); // Clean up
    }

    function hashSection(section) {
        let tags = Array.from(section.querySelectorAll('*')) // Select all child elements
            .map(el => el.tagName.toLowerCase()) // Get tag names
            .join('|'); // Join into a string

        return btoa(tags); // Simple Base64 encoding (can use SHA256 for stronger hashing)
    }

    function findSection(hash){
        let sections = document.querySelectorAll('section');
        for (let section of sections) {
            //console.log(hashSection(section), section);
            if (hashSection(section) === hash) {
                console.log("MATCH");
                return section; // Properly returns the section when found
            }
        }
        return null;

    }


    function changeSections() {
        document.addEventListener("DOMContentLoaded", () => {
            const s1 = findSection("bGlua3xsaW5rfGxpbmt8c3R5bGV8ZGl2fGRpdnxkaXZ8ZGl2fGRpdnxkaXZ8ZGl2fGJyfGJ8YnJ8bm9zY3JpcHR8ZGVmZXJyZWQtbWVkaWF8YnV0dG9ufGltZ3xzcGFufGltZ3x0ZW1wbGF0ZXxkaXZ8ZGl2fGRpdnxoMnx1bHxsaXxkaXZ8ZGl2fGltZ3xkaXZ8c3Ryb25nfHB8cHxwfGxpfGRpdnxkaXZ8aW1nfGRpdnxzdHJvbmd8cHxwfHB8bGl8ZGl2fGRpdnxpbWd8ZGl2fHN0cm9uZ3xwfHB8cHxzdHlsZQ==")
            const s2 = findSection("bGlua3xub3NjcmlwdHxsaW5rfHN0eWxlfGRpdnxkaXZ8ZGl2fGg1fGgyfGRpdnxhfHNsaWRlci1jb21wb25lbnR8dWx8bGl8ZGl2fGRpdnxoM3xkaXZ8aW1nfHNwYW58ZGl2fHB8cHxsaXxkaXZ8ZGl2fGgzfGRpdnxpbWd8c3BhbnxkaXZ8cHxwfGxpfGRpdnxkaXZ8aDN8ZGl2fGltZ3xzcGFufGRpdnxwfHB8ZGl2fGJ1dHRvbnxzdmd8cGF0aHxidXR0b258c3ZnfHBhdGh8ZGl2fGE=")
            if (Math.random() > 0.5)
                swapSections(s1,s2)

        });

    }

    // Synchronize data fetch and DOM readiness
    Promise.all([getSession, waitForDom])
        .then(([session]) => {
            console.log(session);
            sessionId = session.session_id
            session.data.forEach(experiment => handleExperiment(experiment))
            // changeSections()
            // Reveal the body
            document.body.style.opacity = '1';
            // startTracking(customerId, sessionId, session.ids);
        })
        .catch(err => {
            console.error('Error in script execution:', err);
            document.body.style.opacity = '1';
        });

})();


