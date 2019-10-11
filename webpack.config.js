const path = require("path");
// 自动生成html，插入script
const HtmlWebpackPlugin = require("html-webpack-plugin");
// 清除文件
const CleanWebpackPlugin = require("clean-webpack-plugin");
// css抽离
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// css压缩
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
// js压缩
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require("webpack");

const src = path.resolve(__dirname, "src");
const config = {
    mode: "production",
    entry: {
        index: "./src/index.js"
    },
    // 使用 source map
    devtool: "cheap-module-eval-source-map",
    // 使用 webpack-dev-server 实时重新加载(live reloading)
    // 在dev-server.js中设置
    // devServer: {
    //     contentBase: "./dist",
    //     hot: true
    // },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    chunks: "all",
                    name: "vendor",
                    test: /[\\/]node_modules[\\/]/
                }
            }
        },
        minimizer: [
            new OptimizeCSSAssetsPlugin({}),
            new UglifyJsPlugin({
                cache: true,
                parallel: true,
                sourceMap: true
            })
        ]
    },
    performance: {
        // false | "error" | "warning"
        hints: "warning",
        // 最大单个资源体积，默认250000 (bytes)
        maxAssetSize: 30000000,
        // 根据入口起点的最大体积，控制webpack何时生成性能提示整数类型（以字节为单位）
        maxEntrypointSize: 50000000
    },
    // resolve: {
    //     alias: {
    //         "@": path.resolve(__dirname, ''),
    //     }
    // },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].[hash].css",
        }),
        new CleanWebpackPlugin(["dist"]),
        new HtmlWebpackPlugin({
            // html模板文件(在文件中写好title、meta等)
            template: "src/index.html",
            // 输出的路径(包含文件名)
            filename: "./index.html",
            //自动插入js脚本
            // true body head false 默认为true:script标签位于html文件的 body 底部
            // inject: true,
            // chunks主要用于多入口文件，当你有多个入口文件，那就回编译后生成多个打包后的文件，那么chunks 就能选择你要使用那些js文件
            // chunks: ["index", "app"]
            // 压缩html
            minify: {
                // 移除注释
                removeComments: true,
                // 不要留下任何空格
                collapseWhitespace: true,
                // 当值匹配默认值时删除属性
                removeRedundantAttributes: true,
                // 使用短的doctype替代doctype
                useShortDoctype: true,
                // 移除空属性
                removeEmptyAttributes: true,
                // 从style和link标签中删除type="text/css"
                removeStyleLinkTypeAttributes: true,
                // 保留单例元素的末尾斜杠。
                keepClosingSlash: true,
                // 在脚本元素和事件属性中缩小JavaScript(使用UglifyJS)
                minifyJS: true,
                // 缩小CSS样式元素和样式属性
                minifyCSS: true,
                // 在各种属性中缩小url
                minifyURLs: true
            }
        }),

        // 启用 HMR
        new webpack.HotModuleReplacementPlugin(),
        // 在控制台中输出可读的模块名
        new webpack.NamedModulesPlugin(),

        // 不做改动hash保持不变
        new webpack.HashedModuleIdsPlugin()
    ],
    output: {
        filename: "[name].[hash].js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "./"
    },
    // loader处理资源模块
    module: {
        rules: [{
                test: /\.js$/,
                include: src,
                // 排除node_modules文件夹
                exclude: /node_modules/,
                use: [{
                    // cacheDirectory = true 使用缓存，提高性能，将 babel-loader 提速至少两倍
                    loader: "babel-loader?cacheDirectory",
                    options: {
                        presets: [
                            [
                                "env",
                                {
                                    "modules": false
                                }
                            ],
                            "stage-0"
                        ]
                        // plugins: [
                        //     "transform-es2015-modules-commonjs"
                        // ]
                    }
                }]
            },
            {
                test: /\.less$/,
                include: src,
                use: [
                    MiniCssExtractPlugin.loader,
                    // "style-loader",
                    "css-loader",
                    {
                        loader: "postcss-loader",
                        options: {
                            plugins: [
                                require("autoprefixer")()
                            ]
                        }
                    },
                    "less-loader"
                ]
            },
            {
                test: /\.css$/,
                include: src,
                use: [
                    MiniCssExtractPlugin.loader,
                    // "style-loader",
                    "css-loader",
                    {
                        loader: "postcss-loader",
                        options: {
                            plugins: [
                                require("autoprefixer")()
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                include: src,
                use: [
                    "file-loader"
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                include: src,
                use: [
                    "file-loader"
                ]
            }
        ]
    }
};
module.exports = config;