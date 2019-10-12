const style = {
    boxShadow: "0 15px 30px rgba(36, 37, 38, 0.25)",
    transitionIn: ".5s cubic-bezier(1, .45, .44,1)",
    transitionOut: ".2s ease-out",
    transformTarget:  `scale3D(.9, .9, 1) translate3D(0, ${- document.body.offsetHeight * 0.2 - 100}px, 0)`,
    // transformTarget:  `scale3d(.9, .9, 1) translate3D(0, ${- document.body.offsetHeight * 0.2 - 100}px, 0)`,
    transformOrigin: "none"
};
export default style;