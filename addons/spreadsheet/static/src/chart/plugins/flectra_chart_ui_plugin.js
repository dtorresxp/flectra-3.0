/** @flectra-module */

import * as spreadsheet from "@flectra/o-spreadsheet";
import { Domain } from "@web/core/domain";
import { globalFiltersFieldMatchers } from "@spreadsheet/global_filters/plugins/global_filters_core_plugin";
import { ChartDataSource } from "../data_source/chart_data_source";
import { sprintf } from "@web/core/utils/strings";
import { _t } from "@web/core/l10n/translation";

const { UIPlugin } = spreadsheet;

export class FlectraChartUIPlugin extends UIPlugin {
    constructor(config) {
        super(config);
        this.dataSources = config.custom.dataSources;

        globalFiltersFieldMatchers["chart"] = {
            ...globalFiltersFieldMatchers["chart"],
            getTag: async (chartId) => {
                const model = await this.getChartDataSource(chartId).getModelLabel();
                return sprintf(_t("Chart - %s"), model);
            },
            waitForReady: () => this._getFlectraChartsWaitForReady(),
            getFields: (chartId) => this.getChartDataSource(chartId).getFields(),
        };
    }

    beforeHandle(cmd) {
        switch (cmd.type) {
            case "START":
                for (const chartId of this.getters.getFlectraChartIds()) {
                    this._setupChartDataSource(chartId);
                }

                // make sure the domains are correctly set before
                // any evaluation
                this._addDomains();
                break;
        }
    }

    /**
     * Handle a spreadsheet command
     *
     * @param {Object} cmd Command
     */
    handle(cmd) {
        switch (cmd.type) {
            case "CREATE_CHART": {
                switch (cmd.definition.type) {
                    case "flectra_pie":
                    case "flectra_bar":
                    case "flectra_line":
                        this._setupChartDataSource(cmd.id);
                        break;
                }
                break;
            }
            case "UPDATE_CHART": {
                switch (cmd.definition.type) {
                    case "flectra_pie":
                    case "flectra_bar":
                    case "flectra_line": {
                        const dataSource = this.getChartDataSource(cmd.id);
                        if (
                            dataSource.getInitialDomainString() !==
                            new Domain(cmd.definition.searchParams.domain).toString()
                        ) {
                            this._resetChartDataSource(cmd.id);
                        }
                        this._setChartDataSource(cmd.id);
                        break;
                    }
                }
                break;
            }
            case "ADD_GLOBAL_FILTER":
            case "EDIT_GLOBAL_FILTER":
            case "REMOVE_GLOBAL_FILTER":
            case "SET_GLOBAL_FILTER_VALUE":
            case "CLEAR_GLOBAL_FILTER_VALUE":
                this._addDomains();
                break;
            case "UNDO":
            case "REDO": {
                if (
                    cmd.commands.find((command) =>
                        [
                            "ADD_GLOBAL_FILTER",
                            "EDIT_GLOBAL_FILTER",
                            "REMOVE_GLOBAL_FILTER",
                        ].includes(command.type)
                    )
                ) {
                    this._addDomains();
                }

                const domainEditionCommands = cmd.commands.filter(
                    (cmd) => cmd.type === "UPDATE_CHART" || cmd.type === "CREATE_CHART"
                );
                for (const cmd of domainEditionCommands) {
                    if (!this.getters.getFlectraChartIds().includes(cmd.id)) {
                        continue;
                    }
                    const dataSource = this.getChartDataSource(cmd.id);
                    if (
                        dataSource.getInitialDomainString() !==
                        new Domain(cmd.definition.searchParams.domain).toString()
                    ) {
                        this._resetChartDataSource(cmd.id);
                    }
                }
                break;
            }
            case "REFRESH_FLECTRA_CHART":
                this._refreshFlectraChart(cmd.chartId);
                break;
            case "REFRESH_ALL_DATA_SOURCES":
                this._refreshFlectraCharts();
                break;
        }
    }

    /**
     * @param {string} chartId
     * @returns {ChartDataSource|undefined}
     */
    getChartDataSource(chartId) {
        const dataSourceId = this._getFlectraChartDataSourceId(chartId);
        return this.dataSources.get(dataSourceId);
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    /**
     * Add an additional domain to a chart
     *
     * @private
     *
     * @param {string} chartId chart id
     */
    _addDomain(chartId) {
        const domainList = [];
        for (const [filterId, fieldMatch] of Object.entries(
            this.getters.getChartFieldMatch(chartId)
        )) {
            domainList.push(this.getters.getGlobalFilterDomain(filterId, fieldMatch));
        }
        const domain = Domain.combine(domainList, "AND").toString();
        this.getChartDataSource(chartId).addDomain(domain);
    }

    /**
     * Add an additional domain to all chart
     *
     * @private
     *
     */
    _addDomains() {
        for (const chartId of this.getters.getFlectraChartIds()) {
            this._addDomain(chartId);
        }
    }

    /**
     * @param {string} chartId
     * @param {string} dataSourceId
     */
    _setupChartDataSource(chartId) {
        const dataSourceId = this._getFlectraChartDataSourceId(chartId);
        if (!this.dataSources.contains(dataSourceId)) {
            this._resetChartDataSource(chartId);
        }
        this._setChartDataSource(chartId);
    }

    /**
     * Sets the datasource on the corresponding chart
     * @param {string} chartId
     */
    _resetChartDataSource(chartId) {
        const definition = this.getters.getChart(chartId).getDefinitionForDataSource();
        const dataSourceId = this._getFlectraChartDataSourceId(chartId);
        this.dataSources.add(dataSourceId, ChartDataSource, definition);
    }

    /**
     * Sets the datasource on the corresponding chart
     * @param {string} chartId
     */
    _setChartDataSource(chartId) {
        const chart = this.getters.getChart(chartId);
        chart.setDataSource(this.getChartDataSource(chartId));
    }

    /**
     *
     * @return {Promise[]}
     */
    _getFlectraChartsWaitForReady() {
        return this.getters
            .getFlectraChartIds()
            .map((chartId) => this.getChartDataSource(chartId).loadMetadata());
    }

    _getFlectraChartDataSourceId(chartId) {
        return `chart-${chartId}`;
    }

    /**
     * Refresh the cache of a chart
     * @param {string} chartId Id of the chart
     */
    _refreshFlectraChart(chartId) {
        this.getChartDataSource(chartId).load({ reload: true });
    }

    /**
     * Refresh the cache of all the charts
     */
    _refreshFlectraCharts() {
        for (const chartId of this.getters.getFlectraChartIds()) {
            this._refreshFlectraChart(chartId);
        }
    }
}

FlectraChartUIPlugin.getters = ["getChartDataSource"];
