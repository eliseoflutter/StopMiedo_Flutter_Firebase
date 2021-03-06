import 'dart:io';
import 'package:tfg_app/services/auth.dart';
// import 'package:android_intent/android_intent.dart';
import 'package:flutter/material.dart';
import 'package:tfg_app/pages/user/login_page.dart';
import 'package:tfg_app/themes/custom_icon_icons.dart';
import 'package:tfg_app/widgets/buttons.dart';
import 'package:tfg_app/widgets/inputs.dart';
import 'package:tfg_app/widgets/progress.dart';
import 'package:tfg_app/widgets/snackbar.dart';
import 'package:tfg_app/utils/validators.dart';
import 'package:url_launcher/url_launcher.dart';

class ResetPasswordPage extends StatefulWidget {
  /// Name use for navigate to this screen
  static const route = "/reset-password";

  ///Creates a StatelessElement to manage this widget's location in the tree.
  _ResetPasswordPageState createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  // Create controller for handle changes in email field
  TextEditingController _emailController = TextEditingController();

  // Create a global key that uniquely identifies the Scaffold widget,
  // and allows to display snackbars.
  final GlobalKey<ScaffoldState> _scaffoldKey = new GlobalKey<ScaffoldState>();

  // Create a global key that uniquely identifies the Form widget
  // and allows validation of the form.
  final _formKey = GlobalKey<FormState>();

  // Flags to render loading spinner UI.
  bool _isLoading = false;
  bool _emailSent = false;

  AuthService _authService;

  /// Method called when this widget is inserted into the tree.
  @override
  void initState() {
    _authService = AuthService();
    super.initState();
  }

  // Clean up the controllers when the widget is removed from the
  // widget tree.
  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  /**
   * Functions used to handle events in this screen 
   */

  Future<void> _sendResetPasswordEmail() async {
    if (_formKey.currentState.validate()) {
      setState(() {
        _isLoading = true;
      });
      await _authService.resetPassword(_emailController.text.trim()).catchError(
        (error) {
          print("error");
        },
      ).then(
        (value) {
          setState(
            () {
              _emailSent = true;
            },
          );
        },
      );
      setState(
        () {
          _isLoading = false;
        },
      );
    }
  }

  /// Open default email app
  void _openEmailApp() {
    final snackBar = customSnackbar(
        context, "No se pudo abrir ninguna aplicaci??n de correo electr??nico");
    /*
    if (Platform.isAndroid) {
      AndroidIntent intent = AndroidIntent(
        action: 'android.intent.action.MAIN',
        category: 'android.intent.category.APP_EMAIL',
      );
      intent.launch().catchError((e) {
        _scaffoldKey.currentState.showSnackBar(snackBar);
      }).then((value) {
        Navigator.of(context).pushNamedAndRemoveUntil(
            LoginPage.route, (Route<dynamic> route) => false);
      });
    } else if (Platform.isIOS) {
      launch("message://").catchError((e) {
        _scaffoldKey.currentState.showSnackBar(snackBar);
      }).then((value) {
        Navigator.of(context).pushNamedAndRemoveUntil(
            LoginPage.route, (Route<dynamic> route) => false);
      });
    }
    */
  }

  Widget _linkToLogin() {
    return InkWell(
      onTap: () => Navigator.of(context).pushNamedAndRemoveUntil(
          LoginPage.route, (Route<dynamic> route) => false),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            "Volver a ",
          ),
          SizedBox(width: 5),
          Text(
            "Inicio de Sesi??n",
            style: TextStyle(
                color: (Theme.of(context).primaryColor),
                fontWeight: FontWeight.bold),
          )
        ],
      ),
    );
  }

  Widget _emailSentPage() {
    return Padding(
      padding: EdgeInsets.symmetric(
          horizontal: MediaQuery.of(context).size.width * 0.1),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Image.asset(
            'assets/images/correo.png',
            height: MediaQuery.of(context).size.height * 0.15,
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          Text(
            "??Comprueba tu bandeja de entrada!",
            style: Theme.of(context).textTheme.headline6.copyWith(fontSize: 18),
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          Text(
            "Te hemos enviado un correo con un enlace para recuperar tu contrase??a",
            textAlign: TextAlign.justify,
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.05,
          ),
          primaryButton(context, _openEmailApp, "Abrir correo elect??nico"),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          _linkToLogin(),
        ],
      ),
    );
  }

  Form _resetPwdForm() {
    return Form(
      key: _formKey,
      child: customTextInput("Correo Electr??nico", CustomIcon.mail,
          controller: _emailController,
          validator: (val) => Validator.email(val),
          keyboardType: TextInputType.emailAddress),
    );
  }

  Widget _resetPwdPage() {
    return Padding(
      padding: EdgeInsets.symmetric(
          horizontal: MediaQuery.of(context).size.width * 0.1),
      child: ListView(
        children: <Widget>[
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.10,
          ),
          Image.asset(
            'assets/images/olvido.png',
            height: MediaQuery.of(context).size.height * 0.15,
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          Text(
            "Recuperaci??n de contrase??a",
            style: Theme.of(context).textTheme.headline6,
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          Text(
            "Escribe tu correo electr??nico. Recibir??s un enlace para establecer una nueva contrase??a",
            textAlign: TextAlign.justify,
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          _resetPwdForm(),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.1,
          ),
          primaryButton(
              context, _sendResetPasswordEmail, "Recuperar contrase??a"),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.02,
          ),
          _linkToLogin(),
        ],
      ),
    );
  }

  /**
   * Widgets (ui components) used in this screen 
   */

  @override
  Widget build(BuildContext context) {
    Widget children;

    if (_isLoading)
      children = circularProgress(context, text: 'Enviando correo electr??nico');
    else if (_emailSent)
      children = _emailSentPage();
    else
      children = _resetPwdPage();
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: Text('Recuperar contrase??a'),
        actions: <Widget>[],
      ),
      body: children,
    );
  }
}
