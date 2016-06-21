# Signature Signatures

We have a need to identify handwritten signatures across multiple documents. This is an attempt at a cheap and dirty way of identifying signatures and grouping them together by common features.

## How does it work?

Each signature (or in the case of the current test data, handwritten words) is added to a canvas where all color information is removed, leaving only black and transparent pixels. 

The code then works along the X-axis of the image and counts every black pixel along the Y axis of the X-Axis. Each X-Axis can be considered a bucket of values.

