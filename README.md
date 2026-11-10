# SONVÉRA — website

Front-end recreation of the NUMA (numa.uprock.pro) layout and motion system for SONVÉRA.

Double-click `index.html` to open it in your browser. No server is needed.

## Stack (from the reference)
- GSAP 3.12.5 + ScrollTrigger: every scroll scene. NUMA's Taptop keyframes (0–100) are mapped to each section's scroll length.
- Lenis 1.3.8: smooth scrolling (lerp 0.05, same as the reference)
- Swiper 11: sliders on tablet and mobile
- LottieFiles lottie-player 2.0.4: sound-curve animation, scrubbed by scroll (`assets/lottie/sound-curve.json`)
- Google Fonts: Figtree (the reference font)

Megagroup CMS.S3, Taptop, Yandex SmartCaptcha, jQuery, lit and core-js are part of the NUMA hosting platform, so they are not included.

## Structure
- `.desktop` (≥992px): pinned scenes: intro (hero + lifestyle route), numbers, advantages, metrics, app, steps, reviews, footer
- `.adaptive` (≤991px): separate tablet and mobile sections, the same way the reference handles it
- `assets/img`: optimised WebP copies of the images in `/images` (the originals are untouched). `case-closed.webp` and `case-open.webp` are cut-outs.

## Before launch
- Testimonials are placeholder copy ("Customer name"). Replace them with real customer reviews.
- The pre-order form only shows a success message. Connect it to your email or CRM endpoint in `assets/js/main.js` (form submit handler).
