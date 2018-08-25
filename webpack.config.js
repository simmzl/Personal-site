const path = require("path");
// 自动生成html，插入script
const HtmlWebpackPlugin = require("html-webpack-plugin");
// 清除文件
const CleanWebpackPlugin = require("clean-webpack-plugin");
const webpack = require("webpack");

const src = path.resolve(__dirname, "src");
const config = {
    mode:"production",
    entry: {
        index: "./src/index.js"
    },
    // 使用 source map
    devtool: "inline-source-map",
    // 使用 webpack-dev-server 实时重新加载(live reloading)
    devServer: {
        contentBase: "./dist",
        hot: true
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    chunks: "all",
                    name: "vendor",
                    test: /[\\/]node_modules[\\/]/
                }
            }
        }
    },
    performance: {
        hints: 'warning',
        maxAssetSize: 3000000, // 整数类型（以字节为单位）
        maxEntrypointSize: 5000000
    },
    // resolve: {
    //     alias: {
    //         "@": path.resolve(__dirname, ''),
    //     }
    // },
    plugins: [
        new CleanWebpackPlugin(["dist"]),
        new HtmlWebpackPlugin({
            template: "src/index.html",
            filename: "./index.html"
        }),
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin(),

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
        rules: [
            {
                test: /\.js$/,
                include: src,
                exclude: /node_modules/,
                use: [
                    {
                        // 缓存，提高性能
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
                            ],
                            plugins: [
                                "transform-es2015-modules-commonjs"
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.less$/,
                include: src,
                use: [
                    "style-loader",
                    "css-loader",
                    {
                        loader: "postcss-loader",
                        options: {
                            plugins: [
                                require("autoprefixer")({
                                    browsers: [
                                        "ie >= 11",
                                        "ff >= 30",
                                        "chrome >= 34",
                                        "safari >= 7",
                                        "opera >= 23",
                                        "ios >= 7",
                                        "android >= 4.4",
                                        "bb >= 10"
                                    ]
                                })
                            ]
                        }
                    },
                    "less-loader"
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