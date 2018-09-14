import Style from "./style"

const events = {
    menusList: ["home", "blog", "photo", "movie", "music", "github"],
    currentName: "",
    menusContainer: document.querySelector(".menus-container"),
    menus: document.querySelector(".menus"),
    menusBtn: [...document.querySelectorAll(".fixed-center-bottom")],
    container: document.querySelector(".main-container"),
    main: [...document.querySelectorAll(".main")],
    items: [...document.querySelectorAll(".items")],
    init() {
        const me = this;
        location.hash = "";
        me.menusBtn.forEach(i => {
            i.addEventListener("click", _ => {
                const hash = me.getHash();
                if (hash && this.currentName === hash) return me.moveDown(hash);
                const name = hash ? hash : "home";
                me.moveUp(name);
            });
        });
        me.menus.addEventListener("click", e => {
            me.turn(e.target.innerText.toLowerCase());
        }, false);
        me.menusList.forEach((i, index) => {
            if (!index) return;
            document.querySelector(`.${i}`).style.transform = Style.transformTarget;
        });
    },
    moveUp(name) {
        this.currentName = name;
        location.hash = name;
        this.animationUp(document.querySelector(`.${name}`));
    },
    moveDown(name) {
        this.currentName = "";
        location.hash = name;
        this.animationDown(document.querySelector(`.${name}`));
    },
    animationUp(dom) {
        dom.style.transform = Style.transformTarget;
        setTimeout(_ => {
            this.menus.style.zIndex = 1;
        }, 300);
    },
    animationDown(dom) {
        dom.style.transform = Style.transformOrigin;
        this.menus.style.zIndex = 0;
    },
    turn(name) {
        const me = this;
        if (name === me.currentName) return me.moveDown(name);
        const targetIndex = me.menusList.indexOf(name);
        // me.container.style.transform = `translate3d(${- targetIndex * 0.16666 * me.container.offsetWidth}px, 0, 0)`;
        me.container.style.marginLeft = `${- targetIndex * 0.16666 * me.container.offsetWidth}px`;
        setTimeout(_ => {
            me.moveDown(name);
        }, 500);
    },
    // getHash: () => {
    //     const hash = location.hash;
    //     return hash ? hash.slice(1) : "";
    // }
    getHash() {
        const hash = location.hash;
        return hash ? hash.slice(1) : "";
    }
}
export default events;