# -*- coding: utf-8 -*-

from flectra.addons.mail.tests.common import mail_new_test_user
from flectra.addons.product.tests import common


class TestStockCommon(common.TestProductCommon):

    def _create_move(self, product, src_location, dst_location, **values):
        # TDE FIXME: user as parameter
        Move = self.env['stock.move'].with_user(self.user_stock_manager)
        # simulate create + onchange
        move = Move.new({'product_id': product.id, 'location_id': src_location.id, 'location_dest_id': dst_location.id})
        move._onchange_product_id()
        move_values = move._convert_to_write(move._cache)
        move_values.update(**values)
        return Move.create(move_values)

    @classmethod
    def setUpClass(cls):
        super(TestStockCommon, cls).setUpClass()

        # User Data: stock user and stock manager
        cls.user_stock_user = mail_new_test_user(
            cls.env,
            name='Pauline Poivraisselle',
            login='pauline',
            email='p.p@example.com',
            notification_type='inbox',
            groups='stock.group_stock_user',
        )
        cls.user_stock_manager = mail_new_test_user(
            cls.env,
            name='Julie Tablier',
            login='julie',
            email='j.j@example.com',
            notification_type='inbox',
            groups='stock.group_stock_manager',
        )

        # Warehouses
        cls.warehouse_1 = cls.env['stock.warehouse'].create({
            'name': 'Base Warehouse',
            'reception_steps': 'one_step',
            'delivery_steps': 'ship_only',
            'code': 'BWH'})

        # Locations
        cls.location_1 = cls.env['stock.location'].create({
            'name': 'TestLocation1',
            'posx': 3,
            'location_id': cls.warehouse_1.lot_stock_id.id,
        })

        # Partner
        cls.partner_1 = cls.env['res.partner'].create({
            'name': 'Julia Agrolait',
            'email': 'julia@agrolait.example.com',
        })

        # Product
        cls.product_3 = cls.env['product.product'].create({
            'name': 'Stone',  # product_3
            'uom_id': cls.uom_dozen.id,
            'uom_po_id': cls.uom_dozen.id,
        })

        # Existing data
        cls.existing_inventories = cls.env['stock.quant'].search([('inventory_quantity', '!=', 0.0)])
        cls.existing_quants = cls.env['stock.quant'].search([])
