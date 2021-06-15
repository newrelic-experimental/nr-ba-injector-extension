[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# [NR Browser Agent Injector Extension]

>This project will allow users to inject the NR Browser Agent into tabs in Chrome and Firefox using a browser extension for testing, debugging, and demos.  Different versions of the agent will be accessible and configurations will be able to be made on the fly.

## Installation

> 1. Download this repository by clicking `Code` > `Download ZIP` on the main page.
> 2. In Chrome, navigate to chrome://extensions and skip to `step 5` ***~or~*** select the `Settings Menu` in the top right corner
> 3. Select `More Tools`
> 4. Choose `Extensions`
> 5. Enable `Developer Mode` in the top right corner
> 6. Click the `Load Unpacked` button, and select the folder holding the extension files downloaded.

## Getting Started
> 1. Before using, please go through the [Installation](#installation) steps
> 2. Open the extension by clicking on its icon.
> 3. Supply the `staging-one.newrelic.com` NR1 account info to the extension
> 4. Make sure `Tracking` is set to `On`
> 5. Refresh the page if necessary to inject the NR Browser Agent and begin observing the page and any subsequent page.
> 6. Click `Show Logs` to see a list of the injected NR1 calls made in the current tab.

## Development Notes

Every-time a file in the extension is updated, the extension needs to be refreshed:

> * Go to chrome://extensions
> * Under the extension, click on Reload (or press C-R)
> * Runtime logs can be viewed in the extensions page
* **Background Process:** under the extension, click `inspect views background page`
* **Popup Process:** Right click the extension in the top corner of chrome, and hit `inspect popup`

## Other Notes

> As of right now, all data is only sent to `staging-one.newrelic.com` accounts. An input is planned to be added to change the beacon locations.

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

>[Explorers Hub](https://discuss.newrelic.com/)

## Contributing
We encourage your contributions to improve `nr-ba-injector-extension`! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

## License
`nr-ba-injector-extension` is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
