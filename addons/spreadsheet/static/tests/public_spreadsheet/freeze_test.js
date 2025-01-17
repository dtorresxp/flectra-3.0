/** @flectra-module */

import { freezeFlectraData } from "../../src/helpers/model";
import { createSpreadsheetWithChart } from "../utils/chart";
import { setCellContent, setCellFormat, setGlobalFilterValue } from "../utils/commands";
import { getCell, getEvaluatedCell } from "../utils/getters";
import { createSpreadsheetWithPivot } from "../utils/pivot";
import { createModelWithDataSource } from "@spreadsheet/../tests/utils/model";
import { THIS_YEAR_GLOBAL_FILTER } from "@spreadsheet/../tests/utils/global_filter";
import { addGlobalFilter } from "@spreadsheet/../tests/utils/commands";
import { registry } from "@web/core/registry";
import { menuService } from "@web/webclient/menus/menu_service";
import { spreadsheetLinkMenuCellService } from "@spreadsheet/ir_ui_menu/index";
import { getMenuServerData } from "@spreadsheet/../tests/links/menu_data_utils";

QUnit.module("freezing spreadsheet", {}, function () {
    QUnit.test("flectra pivot functions are replaced with their value", async function (assert) {
        const { model } = await createSpreadsheetWithPivot();
        assert.strictEqual(getCell(model, "A3").content, '=FLECTRA.PIVOT.HEADER(1,"bar","false")');
        assert.strictEqual(
            getCell(model, "C3").content,
            '=FLECTRA.PIVOT(1,"probability","bar","false","foo",2)'
        );
        assert.strictEqual(getEvaluatedCell(model, "A3").value, "No");
        assert.strictEqual(getEvaluatedCell(model, "C3").value, 15);
        const data = await freezeFlectraData(model);
        const cells = data.sheets[0].cells;
        assert.strictEqual(cells.A3.content, "No", "the content is replaced with the value");
        assert.strictEqual(cells.C3.content, "15", "the content is replaced with the value");
        assert.strictEqual(data.formats[cells.C3.format], "#,##0.00");
    });

    QUnit.test("values are not exported formatted", async function (assert) {
        const { model } = await createSpreadsheetWithPivot();
        assert.strictEqual(getCell(model, "A3").content, '=FLECTRA.PIVOT.HEADER(1,"bar","false")');
        assert.strictEqual(
            getCell(model, "C3").content,
            '=FLECTRA.PIVOT(1,"probability","bar","false","foo",2)'
        );
        setCellFormat(model, "C3", "mmmm yyyy");
        setCellContent(model, "C4", "=C3+31");
        assert.strictEqual(getEvaluatedCell(model, "C3").value, 15);
        assert.strictEqual(getEvaluatedCell(model, "C3").formattedValue, "January 1900");
        assert.strictEqual(getEvaluatedCell(model, "C4").value, 46);
        assert.strictEqual(getEvaluatedCell(model, "C4").formattedValue, "February 1900");
        const data = await freezeFlectraData(model);
        const sharedModel = await createModelWithDataSource({ spreadsheetData: data });
        assert.strictEqual(getEvaluatedCell(sharedModel, "C3").value, 15);
        assert.strictEqual(getEvaluatedCell(sharedModel, "C3").formattedValue, "January 1900");
        assert.strictEqual(getEvaluatedCell(sharedModel, "C4").value, 46);
        assert.strictEqual(getEvaluatedCell(sharedModel, "C4").formattedValue, "February 1900");
    });

    QUnit.test("invalid expression with pivot function", async function (assert) {
        const { model } = await createSpreadsheetWithPivot();
        setCellContent(model, "A1", "=FLECTRA.PIVOT(1)+"); // invalid expression
        assert.strictEqual(getEvaluatedCell(model, "A1").value, "#BAD_EXPR");
        const data = await freezeFlectraData(model);
        const cells = data.sheets[0].cells;
        assert.strictEqual(
            cells.A1.content,
            "=FLECTRA.PIVOT(1)+",
            "the content is left as is when the expression is invalid"
        );
    });

    QUnit.test("flectra pivot functions detection is not case sensitive", async function (assert) {
        const { model } = await createSpreadsheetWithPivot();
        setCellContent(model, "A1", '=flectra.pivot(1,"probability")');
        setCellContent(model, "A2", '=FLECTRA.pivot(1,"probability")');
        const data = await freezeFlectraData(model);
        const A1 = data.sheets[0].cells.A1;
        const A2 = data.sheets[0].cells.A2;
        assert.strictEqual(A1.content, "131", "the content is replaced with the value");
        assert.strictEqual(A2.content, "131", "the content is replaced with the value");
    });

    QUnit.test("computed format is exported", async function (assert) {
        const { model } = await createSpreadsheetWithPivot({
            arch: /* xml */ `
              <pivot>
                  <field name="pognon" type="measure"/>
              </pivot>
            `,
        });
        setCellContent(model, "A1", '=FLECTRA.PIVOT(1,"pognon")');
        assert.strictEqual(getCell(model, "A1").format, undefined);
        assert.strictEqual(getEvaluatedCell(model, "A1").format, "#,##0.00[$€]");
        const data = await freezeFlectraData(model);
        const A1 = data.sheets[0].cells.A1;
        const format = data.formats[A1.format];
        assert.strictEqual(format, "#,##0.00[$€]");
    });

    QUnit.test("flectra charts are replaced with an image", async function (assert) {
        const { model } = await createSpreadsheetWithChart({ type: "flectra_bar" });
        const data = await freezeFlectraData(model);
        assert.strictEqual(data.sheets[0].figures.length, 1);
        assert.strictEqual(data.sheets[0].figures[0].tag, "image");
    });

    QUnit.test("translation function are replaced with their value", async function (assert) {
        const model = await createModelWithDataSource();
        setCellContent(model, "A1", `=_t("example")`);
        setCellContent(model, "A2", `=CONCATENATE("for",_t(" example"))`);
        assert.strictEqual(getEvaluatedCell(model, "A1").value, "example");
        assert.strictEqual(getEvaluatedCell(model, "A2").value, "for example");
        const data = await freezeFlectraData(model);
        const cells = data.sheets[0].cells;
        assert.strictEqual(cells.A1.content, "example", "the content is replaced with the value");
        assert.strictEqual(
            cells.A2.content,
            "for example",
            "the content is replaced with the value even when translation function is nested"
        );
    });

    QUnit.test("a new sheet is added for global filters", async function (assert) {
        const model = await createModelWithDataSource();
        await addGlobalFilter(model, THIS_YEAR_GLOBAL_FILTER);
        const data = await freezeFlectraData(model);
        assert.strictEqual(data.sheets.length, 2);
        assert.strictEqual(data.sheets[1].name, "Active Filters");
        assert.strictEqual(data.sheets[1].cells.A2.content, "This Year");
    });

    QUnit.test("global filters and their display value are exported", async function (assert) {
        const model = await createModelWithDataSource();
        await addGlobalFilter(model, THIS_YEAR_GLOBAL_FILTER);
        const data = await freezeFlectraData(model);
        assert.strictEqual(data.globalFilters.length, 1);
        assert.strictEqual(data.globalFilters[0].label, "This Year");
        assert.strictEqual(data.globalFilters[0].value, new Date().getFullYear().toString());
    });

    QUnit.test("from/to global filters are exported", async function (assert) {
        const model = await createModelWithDataSource();
        await addGlobalFilter(model, {
            id: "42",
            type: "date",
            label: "Date Filter",
            rangeType: "from_to",
        });
        await setGlobalFilterValue(model, {
            id: "42",
            value: {
                from: "2020-01-01",
                to: "2021-01-01",
            },
        });
        const data = await freezeFlectraData(model);
        const filterSheet = data.sheets[1];
        assert.strictEqual(filterSheet.cells.B2.content, "43831");
        assert.strictEqual(filterSheet.cells.C2.content, "44197");
        assert.strictEqual(filterSheet.cells.B2.format, 1);
        assert.strictEqual(filterSheet.cells.C2.format, 1);
        assert.strictEqual(data.formats[1], "m/d/yyyy");
        assert.strictEqual(data.globalFilters.length, 1);
        assert.strictEqual(data.globalFilters[0].label, "Date Filter");
        assert.strictEqual(data.globalFilters[0].value, "1/1/2020, 1/1/2021");
    });

    QUnit.test("from/to global filter without value is exported", async function (assert) {
        const model = await createModelWithDataSource();
        await addGlobalFilter(model, {
            id: "42",
            type: "date",
            label: "Date Filter",
            rangeType: "from_to",
        });
        const data = await freezeFlectraData(model);
        const filterSheet = data.sheets[1];
        assert.strictEqual(filterSheet.cells.A2.content, "Date Filter");
        assert.strictEqual(filterSheet.cells.B2, undefined);
        assert.strictEqual(filterSheet.cells.C2, undefined);
        assert.strictEqual(data.globalFilters.length, 1);
        assert.strictEqual(data.globalFilters[0].label, "Date Filter");
        assert.strictEqual(data.globalFilters[0].value, "");
    });

    QUnit.test("flectra links are replaced with their label", async function (assert) {
        const view = {
            name: "an flectra view",
            viewType: "list",
            action: {
                modelName: "partner",
                views: [[false, "list"]],
            },
        };
        const data = {
            sheets: [
                {
                    cells: {
                        A1: { content: "[menu_xml](flectra://ir_menu_xml_id/test_menu)" },
                        A2: { content: "[menu_id](flectra://ir_menu_id/12)" },
                        A3: { content: `[flectra_view](flectra://view/${JSON.stringify(view)})` },
                        A4: { content: "[external_link](https://flectrahq.com)" },
                        A5: { content: "[internal_link](o-spreadsheet://Sheet1)" },
                    },
                },
            ],
        };
        registry
            .category("services")
            .add("menu", menuService)
            .add("spreadsheetLinkMenuCell", spreadsheetLinkMenuCellService);

        const model = await createModelWithDataSource({
            spreadsheetData: data,
            serverData: getMenuServerData(),
        });
        const frozenData = await freezeFlectraData(model);
        assert.strictEqual(frozenData.sheets[0].cells.A1.content, "menu_xml");
        assert.strictEqual(frozenData.sheets[0].cells.A2.content, "menu_id");
        assert.strictEqual(frozenData.sheets[0].cells.A3.content, "flectra_view");
        assert.strictEqual(
            frozenData.sheets[0].cells.A4.content,
            "[external_link](https://flectrahq.com)"
        );
        assert.strictEqual(
            frozenData.sheets[0].cells.A5.content,
            "[internal_link](o-spreadsheet://Sheet1)"
        );
    });
});
