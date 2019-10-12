import Style from "./style"

const events = {
    MENUS_LIST: ["home", "blog", "photo", "movie", "music", "github"],
    currentName: "home",
    status: false,
    // 菜单
    menus: document.querySelector(".menus"),
    // 多页面总容器
    container: document.querySelector(".main-container"),
    init() {
        const me = this;
        location.hash = "";

        $(".icon-left").click(() => {
            const hash = me.getHash();
            if (!hash || hash === "home") return;
            const nextIndex = this.MENUS_LIST.findIndex(item => this.currentName === item) - 1;
            this.turn(this.MENUS_LIST[nextIndex]);
        });

        $(".icon-right").click( _ => {
            const hash = me.getHash();
            if (hash === "github") return;
            if (!this.currentName) this.currentName = "home";
            const nextIndex = this.MENUS_LIST.findIndex(item => this.currentName === item) + 1;
            this.turn(this.MENUS_LIST[nextIndex]);
        });

        // 打开菜单
        $(".btns").click( _ => {
            const hash = me.getHash();
            if (hash && this.currentName === hash && me.status) {
                me.status = !me.status;
                return me.moveDown(hash);
            }
            me.status = !me.status;
            this.currentName = hash;
            me.MENUS_LIST.forEach(i => this.animationUp(document.querySelector(`.${i}`)));
        });
        // 菜单
        me.menus.addEventListener("click", e => {
            if (e.target.tagName.toLowerCase() === "p" ) {
                me.turn(e.target.innerText.toLowerCase());
            }
        }, false);
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
    },
    animationDown(dom) {
        dom.style.transform = Style.transformOrigin;
    },

    turn(name) {
        const me = this;
        if (name === me.currentName) return me.moveDown(name);
        const targetIndex = me.MENUS_LIST.indexOf(name);
        // me.container.style.transform = `translate3d(${- targetIndex * 0.16666 * me.container.offsetWidth}px, 0, 0)`;
        me.container.style.marginLeft = `${- targetIndex * 0.16666 * me.container.offsetWidth}px`;
        setTimeout(_ => {
            me.MENUS_LIST.forEach(i => this.animationDown(document.querySelector(`.${i}`)));
            me.moveDown(name);
            me.currentName = name;
            me.status = false;
        }, 500);
    },
    getHash() {
        location.hash ? "" : location.hash = "#home" ;
        return location.hash.slice(1);
    }
}
export default events;