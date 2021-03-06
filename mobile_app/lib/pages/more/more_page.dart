import 'package:flutter/material.dart';
import 'package:tfg_app/pages/phy_activity/daily_heart_rate.dart';
import 'package:tfg_app/pages/phy_activity/phy_activity_settings.dart';
import 'package:tfg_app/pages/user/aviso_legal.dart';
import 'package:tfg_app/pages/user/login_page.dart';
import 'package:tfg_app/pages/user/privacidad.dart';
import 'package:tfg_app/pages/user/udpate_password.dart';
import 'package:tfg_app/widgets/buttons.dart';
import 'package:tfg_app/services/auth.dart';
import 'package:tfg_app/widgets/progress.dart';
import 'package:tfg_app/pages/user/profile.dart';

class MorePage extends StatefulWidget {
  ///Creates a StatelessElement to manage this widget's location in the tree
  _MorePageState createState() => _MorePageState();
}

/// State object for MorePage that contains fields that affect
/// how it looks.
class _MorePageState extends State<MorePage> {
  // Flags to render loading spinner UI.
  bool _isLoading = false;

  AuthService _authService;

  /// Method called when this widget is inserted into the tree.
  @override
  void initState() {
    super.initState();

    _authService = AuthService();
  }

  @override
  void dispose() {
    super.dispose();
  }
  /**
   * Functions used to handle events in this screen 
   */

  Future<void> _logout() async {
    setState(() {
      _isLoading = true;
    });

    await _authService.signOut();

    Navigator.of(context).pushNamedAndRemoveUntil(
        LoginPage.route, (Route<dynamic> route) => false);
  }

  Widget _sectionHeader(
    String title,
  ) {
    return Text(title.toUpperCase(),
        style: TextStyle(
            color: Theme.of(context).primaryColor,
            fontWeight: FontWeight.w400,
            fontSize: 12));
  }

  Widget _sectionItem(String title, Function onTap, {String subtitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 0),
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                Text(
                  title,
                ),
                Icon(
                  Icons.keyboard_arrow_right,
                  color: Colors.black45,
                  size: 20,
                ),
              ],
            ),
            subtitle != null
                ? Text(
                    subtitle,
                  )
                : SizedBox(height: 0),
          ],
        ),
      ),
    );
  }

  Widget _morePage() {
    double verticalPadding = MediaQuery.of(context).size.height * 0.02;
    return ListView(
      padding: const EdgeInsets.only(top: 12.0, left: 15, right: 15),
      children: <Widget>[
        _sectionHeader("Perfil"),
        _sectionItem(
          "Mi cuenta",
          () => Navigator.of(context).pushNamed(ProfilePage.route),
        ),
        _sectionItem(
          "Cambiar contrase??a",
          () => Navigator.of(context).pushNamed(
            UpdatePassword.route,
          ),
        ),
        Divider(
          height: verticalPadding,
        ),
        SizedBox(
          height: verticalPadding,
        ),
        _sectionHeader("Terapia"),
        _sectionItem("Sobre la amaxofobia", null),
        _sectionItem("Desensibilizaci??n sistem??tica", null),
        Divider(
          height: verticalPadding,
        ),
        SizedBox(
          height: verticalPadding,
        ),
        _sectionHeader("Frecuencia cardiaca"),
        _sectionItem(
          "Datos diarios",
          () => Navigator.of(context).pushNamed(
            DailyHeartRatePage.route,
          ),
        ),
        _sectionItem(
          "Configurar",
          () => Navigator.of(context).pushNamed(
            PhyActivitySettings.route,
          ),
        ),
        Divider(
          height: verticalPadding,
        ),
        SizedBox(
          height: verticalPadding,
        ),
        //_sectionHeader("Preferencias"),
        //_sectionItem("Idioma", null),
        //_sectionItem("Notificaciones", null),
        _sectionHeader("Otros"),
        _sectionItem(
          "Aspectos Legales",
          () => Navigator.of(context).pushNamed(
            AvisoLegalPage.route,
          ),
        ),
        /*
        _sectionItem(
          "Pol??tica de Privacidad",
          () => Navigator.of(context).pushNamed(
            PoliticaPrivacidad.route,
          ),
        ),*/
        Divider(
          height: verticalPadding,
        ),
        SizedBox(
          height: verticalPadding,
        ),
        primaryButton(context, () async {
          await _logout();
        }, "Cerrar sesi??n"),
      ],
    );
  }

  ///Describes the part of the user interface represented by this widget.
  @override
  Widget build(BuildContext context) {
    return new Scaffold(
      appBar: AppBar(
        title: Text('M??s'),
        actions: <Widget>[],
      ),
      body: _isLoading
          ? circularProgress(context, text: "Cerrando sesi??n")
          : _morePage(),
    );
  }
}
