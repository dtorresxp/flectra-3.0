# -*- coding: utf-8 -*-
# Part of Flectra. See LICENSE file for full copyright and licensing details.

from flectra import fields, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    team_id = fields.Many2one(
        'crm.team', 'Sales Team',
        help='If set, this Sales Team will be used for sales and assignments related to this partner')
