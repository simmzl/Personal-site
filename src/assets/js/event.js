import Style from "./style"

const events = {
    menusList: ["home", "blog", "photo", "movie", "music", "github"],
    currentName: "",
    menusContainer: document.querySelector(".menus-container"),
    menus: document.querySelector(".menus"),
    container: document.querySelector(".main-container"),
    main: [...document.querySelectorAll(".main")],
    items: [...document.querySelectorAll(".items")],
    init: function() {
        const me = this;
        me.items.forEach(i => {
            i.addEventListener("click", e => {
                const name = e.target.innerText.toLowerCase();
                if (name === me.currentName) return me.moveDown(name);
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
    moveUp: function(name) {
        this.currentName = name;
        this.animationUp(document.querySelector(`.${name}`));
    },
    moveDown: function(name) {
        this.currentName = "";
        this.animationDown(document.querySelector(`.${name}`));
    },
    animationUp: function(dom) {
        dom.style.transform = Style.transformTarget;
        setTimeout(_ => {
            this.menus.style.zIndex = 1;
        }, 300);
    },
    animationDown: function(dom) {
        dom.style.transform = Style.transformOrigin;
        setTimeout(_ => {
            this.menus.style.zIndex = 0;
        }, 300);
    },
    turn: function(name) {
        const me = this;
        // if (name === me.currentName) return;
        const targetIndex = me.menusList.indexOf(name);
        // me.container.style.transform = `translate3d(${- targetIndex * 0.16666 * me.container.offsetWidth}px, 0, 0)`;
        me.container.style.marginLeft = `${- targetIndex * 0.16666 * me.container.offsetWidth}px`;
        setTimeout(_ => {
            me.moveDown(name);
        }, 500);
    }
}
export default events;