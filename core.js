(function () {
    const SESSION_KEY = 'maniac_session_id';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds


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


    // Synchronize data fetch and DOM readiness
    Promise.all([getSession,waitForDom])
        .then(([session]) => {
            console.log(session);
            document.body.style.opacity = '1';
            // startTracking(customerId, sessionId, session.ids);
        })
        .catch(err => {
            console.error('Error in script execution:', err);
            document.body.style.opacity = '1';
        });

})();


