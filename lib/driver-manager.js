import webdriver from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';
import chrome from 'selenium-webdriver/chrome';
import config from 'config';
import proxy from 'selenium-webdriver/proxy';

const webDriverImplicitTimeOutMS = 2000;
const webDriverPageLoadTimeOutMS = 60000;
const browser = config.get( 'browser' );

export function currentScreenSize() {
	var screenSize = process.env.BROWSERSIZE;
	if ( screenSize === undefined || screenSize === '' ) {
		screenSize = 'desktop';
	}
	return screenSize.toLowerCase();
}

export function getSizeAsObject() {
	switch ( this.currentScreenSize() ) {
		case 'mobile':
			return { width: 400, height: 1000};
		case 'tablet':
			return { width: 1024, height: 1000};
		case 'desktop':
			return { width: 1440, height: 1000};
		case 'laptop':
			return { width: 1400, height: 790};
		default:
			throw new Error( 'Unsupported screen size specified. Supported values are desktop, tablet and mobile.' );
	}
}

export function getProxyType() {
	var proxyType = config.get( 'proxy' );
	switch ( proxyType.toLowerCase() ) {
		case 'direct':
			return proxy.direct();
		case 'system':
			return proxy.system();
		default:
			throw new Error( `Unknown proxy type specified of: '${proxyType}'. Supported values are 'direct' or 'system'` );
	}
}

export function startBrowser() {
	if ( global.__BROWSER__ ) {
		return global.__BROWSER__;
	}
	const screenSize = this.currentScreenSize();
	let driver;
	let options;
	let builder;
	let pref = new webdriver.logging.Preferences();
	pref.setLevel( 'browser', webdriver.logging.Level.ALL );
	switch ( browser.toLowerCase() ) {
		case 'chrome':
			options = new chrome.Options();
			options.setProxy( this.getProxyType() );
			options.addArguments( '--no-sandbox' );
			builder = new webdriver.Builder();
			builder.setChromeOptions( options );
			global.__BROWSER__ = driver = builder.forBrowser( 'chrome' ).setLoggingPrefs( pref ).build();
			break;
		case 'firefox':
			let profile = new firefox.Profile();
			profile.setNativeEventsEnabled( true );
			profile.setPreference( 'browser.startup.homepage_override.mstone', 'ignore' );
			profile.setPreference( 'browser.startup.homepage', 'about:blank' );
			profile.setPreference( 'startup.homepage_welcome_url.additional', 'about:blank' );
			options = new firefox.Options().setProfile( profile );
			options.setProxy( this.getProxyType() );
			builder = new webdriver.Builder();
			builder.setFirefoxOptions( options );
			global.__BROWSER__ = driver = builder.forBrowser( 'firefox' ).setLoggingPrefs( pref ).build();
			break;
		case 'sauce':
			let profileSauce = new firefox.Profile();
			profileSauce.setNativeEventsEnabled( true );
			profileSauce.setPreference( 'browser.startup.homepage_override.mstone', 'ignore' );
			profileSauce.setPreference( 'browser.startup.homepage', 'about:blank' );
			profileSauce.setPreference( 'startup.homepage_welcome_url.additional', 'about:blank' );
			options = new firefox.Options().setProfile( profileSauce );
			options.setProxy( this.getProxyType() );
			builder = new webdriver.Builder();
//			builder.setFirefoxOptions( options );
			global.__BROWSER__ = driver = builder.usingServer( 'http://ondemand.saucelabs.com:80/wd/hub' ).
				withCapabilities( {
					browserName: 'Chrome',
					platform: 'OS X 10.10',
					screenResolution: '2048x1536',
					name: 'Sample selenium-webdriver test',
					nativeEvents: true,
					version: '48.0',
					username: process.env.SAUCE_USERNAME,
					accessKey: process.env.SAUCE_ACCESS_KEY
				} ).
				build();
			break;
		case 'safari':
//TODO - try with Sauce Labs, won't work on vanilla CircleCI (Linux)
			let safari = require( 'selenium-webdriver/safari' );
			options = new safari.Options();
			options.setCleanSession( true );
			builder = new webdriver.Builder();
			builder.setSafariOptions( options );
			global.__BROWSER__ = driver = builder.usingServer( 'http://ondemand.saucelabs.com:80/wd/hub' ).
				withCapabilities( {
					browserName: 'Firefox',
					name: 'Sample selenium-webdriver test',
					username: process.env.SAUCE_USERNAME,
					accessKey: process.env.SAUCE_ACCESS_KEY
				} ).
				build();
			break;
		case 'safari':
//TODO - try with Sauce Labs, won't work on vanilla CircleCI (Linux)
			let safari = require( 'selenium-webdriver/safari' );
			options = new safari.Options();
			options.setCleanSession( true );
			builder = new webdriver.Builder();
			builder.setSafariOptions( options );
			global.__BROWSER__ = driver = builder.forBrowser( 'safari' ).build();
			break;
		default:
			throw new Error( `The specified browser: '${browser}' in the config is not supported. Supported browsers are 'chrome' and 'firefox'` );
	}
	driver.manage().timeouts().implicitlyWait( webDriverImplicitTimeOutMS );
	driver.manage().timeouts().pageLoadTimeout( webDriverPageLoadTimeOutMS );
	this.resizeBrowser( driver, screenSize );
	return driver;
}

export function resizeBrowser( driver, screenSize ) {
	if ( typeof ( screenSize ) === 'string' ) {
		switch ( screenSize.toLowerCase() ) {
			case 'mobile':
				driver.manage().window().setSize( 400, 1000 );
				break;
			case 'tablet':
				driver.manage().window().setSize( 1024, 1000 );
				break;
			case 'desktop':
				driver.manage().window().setSize( 1440, 1000 );
				break;
			case 'laptop':
				driver.manage().window().setSize( 1400, 790 );
				break;
			default:
				throw new Error( 'Unsupported screen size specified (' + screenSize + '). Supported values are desktop, tablet and mobile.' );
		}
	} else {
		throw new Error( 'Unsupported screen size specified (' + screenSize + '). Supported values are desktop, tablet and mobile.' );
	}
}

export function clearCookiesAndDeleteLocalStorage( driver ) {
	driver.manage().deleteAllCookies();
	return this.deleteLocalStorage( driver );
}

export function deleteLocalStorage( driver ) {
	driver.getCurrentUrl().then( ( url ) => {
		if ( url.startsWith( 'data:' ) === false ) {
			return driver.executeScript( 'window.localStorage.clear();' );
		}
	} );
}

export function ensureNotLoggedIn( driver ) {
	// This makes sure neither auth domain or local domain has any cookies or local storage
	driver.get( config.get( 'authURL' ) );
	this.clearCookiesAndDeleteLocalStorage( driver );
	driver.get( config.get( 'calypsoBaseURL' ) );
	return this.clearCookiesAndDeleteLocalStorage( driver );
}

export function quitBrowser( driver ) {
	// Sleep for 3 seconds before closing the browser to make sure all JS console errors are captured
	driver.sleep( 3000 ).then( function() {
		driver.quit();
	} );
}
