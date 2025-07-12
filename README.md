# ZeroTrace Extension

An advanced, open-source browser extension for comprehensive privacy protection, anti-tracking, and digital identity management, with support for both Chrome and Firefox.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-5.0-blue.svg)]()
[![Status](https://img.shields.io/badge/Status-Complete-brightgreen.svg)]()

---

## Browser Support

![Chrome](https://img.shields.io/badge/Chrome-Supported-brightgreen.svg)
![Firefox](https://img.shields.io/badge/Firefox-Supported-orange.svg)

---

## Key Features

This extension is an all-in-one solution designed to protect you against a wide array of tracking methods and information leaks:

* **WebRTC Leak Protection:** Prevents the exposure of your real IP address when using a VPN.
* **Dynamic Tracker Blocker:** Blocks thousands of known advertising and tracking domains using dynamically updated and user-supplied custom blocklists.
* **Advanced Anti-Fingerprinting:** Neutralizes sophisticated device identification techniques, including Canvas, WebGL, and AudioContext fingerprinting.
* **Full Location Spoofing:** Aligns your entire digital identity with your VPN's IP location by faking the timezone, geolocation, and browser language.
* **Complete User Control:**
    * **Whitelist:** Easily disable protection for specific websites that may not function correctly.
    * **Advanced Options Page:** Granular control to toggle every single protection feature individually.
    * **Blocklist Management:** Add your own custom blocklist URLs for enhanced protection.
* **Advanced User Interface:**
    * A clean popup that displays the overall protection status and a real-time count of blocked trackers.
    * **Live Test** functionality to quickly check the status of your public IP address.
    * Includes a user-friendly **Dark Mode** for eye comfort.
    * A dedicated **Help Page** with full documentation.

---

## Screenshots

<p align="center">
  <img src="path/to/your/screenshot_popup.png" alt="Main Popup" width="300">
  <br>
  <em>Main Popup Interface (Light & Dark Mode)</em>
</p>
<p align="center">
  <img src="path/to/your/screenshot_options.png" alt="Options Page" width="600">
  <br>
  <em>Advanced Settings Page</em>
</p>

---

## Installation

This project now contains separate versions for Chrome and Firefox. Please follow the instructions for your browser.

### For Google Chrome

1.  Download the project and unzip the main folder.
2.  Open your Chrome browser and navigate to `chrome://extensions`.
3.  Enable **Developer mode** using the toggle switch in the top-right corner.
4.  Click the **Load unpacked** button.
5.  Select the **`chrome`** sub-folder from the project directory.

### For Mozilla Firefox

1.  Download the project and unzip the main folder.
2.  Open your Firefox browser and navigate to `about:debugging#/runtime/this-firefox`.
3.  Click the **Load Temporary Add-on...** button.
4.  Navigate into the **`firefox`** sub-folder and select the `manifest.json` file.

The extension is now installed and ready to use.

---

## How to Use

* **Popup:** Click the extension's icon in your toolbar to view the main dashboard. From here, you can see the overall protection status, toggle it on or off, whitelist the current site, and run a live IP test.
* **Options Page:** To access advanced settings, click the "Settings" link in the popup. This page allows you to manage each security feature individually and add your custom blocklists.
* **Help Page:** For a full breakdown of each feature and how to test them, click the "Guide" link in the popup.

---

## Technology Stack

* **Manifest V3:** The latest extension standard for enhanced security and performance.
* **JavaScript (ES6+):** Used to implement all of the extension's logic.
* **`declarativeNetRequest` API:** For high-performance, privacy-preserving tracker blocking.
* **`scripting` API:** To inject defensive scripts into web pages at runtime.
* **`webRequest` API:** For monitoring network requests to count blocked trackers.
* **HTML5 / CSS3:** To build the user interface for the popup and options page.

---

## Support the Project

If you find this extension useful, please consider supporting its development through one of the addresses below:

* **Bitcoin (BTC):** `bc1q...placeholder...xyz`
* **Ethereum (ETH):** `0x123...placeholder...abc`
* **Monero (XMR):** `442A...placeholder...def`

---

## License

This project is licensed under the **MIT License**.

<p align="center">Created with ❤️ by GeekNeuron</p>
