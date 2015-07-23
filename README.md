# Swirl

CSS-based styling brought to JavaScript.

*Please be advised that the API is not frozen. It is under constant development and may drastically change at any time.*
*If you would like to follow up on those things, please visit the wiki or issues section. This is where potential API changes will be proposed and discussed.*

## Installation

Download the compiled minified file [swirl.min.js](https://raw.githubusercontent.com/karimsa/swirl/master/swirl.min.js) (and if you'd like to be able to report issues, also download [swirl.min.js.map](https://raw.githubusercontent.com/karimsa/swirl/master/swirl.min.js.map)).

Place the file(s) somewhere in your project folder, and import the minified source like you would import any script:

```html
<script src="js/swirl.min.js"></script>
```

## Usage

There's a few different ways to use Swirl, depending on your project. Most simply, you can use the global `Style` class:

**Simplest usage:**

```javascript
// create a new style
var style = new Style();

// set the properties for your rule
style.color('#fff')
	 .background('#000');
	
// and then apply it to whatever selectors you
// want to use this rule on
style.apply('.my-class')
	 .apply('#my-element, mytag[myattr="myval"]');
```

### Creating custom classes:

Creating custom classes helps you export your styles as a module for others to use. This helps create extensible UI/UX frameworks and libraries.

```javascript
// this class can now be exported as a module
class MyCustomClass extends Style {
	constructor (color) {
		super();
		
		// set up your initial styles
		this.theme(color);
	}
	
	// create whatever additional methods you wish to use
	theme ( color ) {
		this.color( color )
			.background( invert ( color ) );
	}
}

// create an instance of the class
var style = new MyCustomClass('#fff');
style.apply('.my-element');
```

## License

GPL-3.0, see [LICENSE](LICENSE).