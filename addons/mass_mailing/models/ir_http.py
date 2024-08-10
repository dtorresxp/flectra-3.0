# Part of Flectra. See LICENSE file for full copyright and licensing details.

from flectra import models


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    @classmethod
    def _get_translation_frontend_modules_name(cls):
        mods = super()._get_translation_frontend_modules_name()
        return mods + ["mass_mailing"]
