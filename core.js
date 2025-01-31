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

    // Synchronize data fetch and DOM readiness
    Promise.all([waitForDom])
        .then(() => {
            console.log("READY")
            document.body.style.opacity = '1';
            // startTracking(customerId, sessionId, session.ids);
        })
        .catch(err => {
            console.error('Error in script execution:', err);
            document.body.style.opacity = '1';
        });

})();


