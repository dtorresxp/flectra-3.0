# -*- coding: utf-8 -*-
# Part of Flectra. See LICENSE file for full copyright and licensing details.

import flectra
import flectra.exceptions

def check(db, uid, passwd):
    res_users = flectra.registry(db)['res.users']
    return res_users.check(db, uid, passwd)

def compute_session_token(session, env):
    self = env['res.users'].browse(session.uid)
    return self._compute_session_token(session.sid)

def check_session(session, env):
    self = env['res.users'].browse(session.uid)
    expected = self._compute_session_token(session.sid)
    if expected and flectra.tools.misc.consteq(expected, session.session_token):
        return True
    return False
